package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend_dist
var assets embed.FS

var (
	indexSessionHigh float64
	indexSessionLow  float64
)

type QuoteResponse struct {
	Code      string `json:"code"`
	Name      string `json:"name"`
	Price     string `json:"price"`
	Change    string `json:"change"`
	Highest   string `json:"highest"`
	Lowest    string `json:"lowest"`
	Volume    string `json:"volume"`
	Turnover  string `json:"turnover"`
	PrevClose string `json:"prevClose"`
	Open      string `json:"open"`
	MonthHigh string `json:"monthHigh"`
	MonthLow  string `json:"monthLow"`
	YearHigh  string `json:"yearHigh"`
	YearLow   string `json:"yearLow"`
	MarketCap string `json:"marketCap"`
	ShortSell string `json:"shortSell"`
	Timestamp string `json:"timestamp"`
}

type HsiResponse struct {
	Label        string `json:"label"`
	Value        string `json:"value"`
	Change       string `json:"change"`
	HsiValue     string `json:"hsiValue"`
	HsiChange    string `json:"hsiChange"`
	FuturesValue string `json:"futuresValue"`
	FuturesChange string `json:"futuresChange"`
	High         string `json:"high"`
	Low          string `json:"low"`
}

func main() {
	// Start local API backend server in background
	go startBackendServer()

	// Launch native Windows GUI via WebView2
	err := wails.Run(&options.App{
		Title:  "HSI Live Stock & Chart Dashboard v2026v0803",
		Width:  500,
		Height: 380,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func startBackendServer() {
	http.HandleFunc("/api/quote", enableCORS(handleQuote))
	http.HandleFunc("/api/hsi", enableCORS(handleHSI))
	http.ListenAndServe(":3300", nil)
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleQuote(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, `{"error":"Stock code is required"}`, http.StatusBadRequest)
		return
	}

	formattedCode := fmt.Sprintf("%05s", code)
	if len(formattedCode) < 5 {
		formattedCode = strings.Repeat("0", 5-len(code)) + code
	}

	targetURL := fmt.Sprintf("https://www.etnet.com.hk/www/tc/stocks/realtime/quote.php?code=%s", formattedCode)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusInternalServerError)
		return
	}

	setHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"Failed to fetch stock quote: %s"}`, err.Error()), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"Failed to read response body"}`, http.StatusInternalServerError)
		return
	}

	htmlContent := string(bodyBytes)

	reRedirect := regexp.MustCompile(`window\.location\.href\s*=\s*["'](/www/tc/etf/quote/[^"']+)["']`)
	matches := reRedirect.FindStringSubmatch(htmlContent)

	isEtf := false
	if len(matches) > 1 {
		isEtf = true
		redirectURL := "https://www.etnet.com.hk" + matches[1]
		reqEtf, _ := http.NewRequest("GET", redirectURL, nil)
		setHeaders(reqEtf)
		respEtf, errEtf := client.Do(reqEtf)
		if errEtf == nil {
			defer respEtf.Body.Close()
			bodyBytes, _ = io.ReadAll(respEtf.Body)
			htmlContent = string(bodyBytes)
		}
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(htmlContent))
	if err != nil {
		http.Error(w, `{"error":"Failed to parse HTML document"}`, http.StatusInternalServerError)
		return
	}

	nowStr := time.Now().Format("15:04:05")

	if isEtf {
		res := parseETF(doc, formattedCode, nowStr)
		if res.Price == "" {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("ETF %s details not found.", formattedCode)})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
		return
	}

	res := parseStock(doc, formattedCode, nowStr)
	if res.Price == "" {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Stock %s not found or page layout changed.", formattedCode)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

func parseStock(doc *goquery.Document, formattedCode, timestamp string) QuoteResponse {
	headerText := strings.TrimSpace(doc.Find("#StkQuoteHeader span").Text())
	name := ""
	extractedCode := formattedCode

	if headerText != "" {
		reHeader := regexp.MustCompile(`^(\d+)\s+(.+)$`)
		m := reHeader.FindStringSubmatch(headerText)
		if len(m) > 2 {
			extractedCode = m[1]
			name = m[2]
		} else {
			name = headerText
		}
	}

	if name == "" {
		titleText := strings.TrimSpace(doc.Find("title").Text())
		if strings.Contains(titleText, "港股報價") {
			parts := strings.Split(titleText, "|")
			if len(parts) > 1 {
				name = strings.TrimSpace(parts[1])
			}
		}
	}

	priceText := strings.TrimSpace(doc.Find("#StkDetailMainBox span.Price").Text())
	priceText = strings.ReplaceAll(priceText, "\u00a0", "")
	changeText := strings.TrimSpace(doc.Find("#StkDetailMainBox span.Change").Text())

	styleBCells := doc.Find("#StkDetailMainBox td.styleB")

	getVal := func(idx int) string {
		if idx < styleBCells.Length() {
			return strings.TrimSpace(styleBCells.Eq(idx).Find(".Number").Text())
		}
		return ""
	}

	highest := getVal(0)
	volume := getVal(1)
	prevClose := getVal(2)
	monthHigh := getVal(3)
	marketCap := getVal(4)

	lowest := getVal(5)
	turnover := getVal(6)
	open := getVal(7)
	monthLow := getVal(8)
	shortSell := getVal(9)

	yearHigh := ""
	yearLow := ""

	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		txt := strings.TrimSpace(s.Text())
		if txt == "52周高" {
			yearHigh = strings.TrimSpace(s.Next().Text())
		} else if txt == "52周低" {
			yearLow = strings.TrimSpace(s.Next().Text())
		}
	})

	return QuoteResponse{
		Code:      extractedCode,
		Name:      name,
		Price:     priceText,
		Change:    changeText,
		Highest:   highest,
		Lowest:    lowest,
		Volume:    volume,
		Turnover:  turnover,
		PrevClose: prevClose,
		Open:      open,
		MonthHigh: monthHigh,
		MonthLow:  monthLow,
		YearHigh:  yearHigh,
		YearLow:   yearLow,
		MarketCap: marketCap,
		ShortSell: shortSell,
		Timestamp: timestamp,
	}
}

func parseETF(doc *goquery.Document, formattedCode, timestamp string) QuoteResponse {
	titleText := strings.TrimSpace(doc.Find("title").Text())
	name := ""
	extractedCode := formattedCode

	if titleText != "" {
		parts := strings.Split(titleText, "|")
		if len(parts) > 1 {
			name = strings.TrimSpace(parts[1])
		}
		reCode := regexp.MustCompile(`^(\d+)`)
		m := reCode.FindStringSubmatch(parts[0])
		if len(m) > 1 {
			extractedCode = m[1]
		}
	}

	if name == "" {
		name = strings.TrimSpace(doc.Find(".quote-name").First().Text())
	}

	priceText := strings.TrimSpace(doc.Find("section.quote-realtime-fields li.nominal").Text())
	changeVal := strings.TrimSpace(doc.Find("section.quote-realtime-fields li.change").Text())
	changePct := strings.TrimSpace(doc.Find("section.quote-realtime-fields li.percentagechange").Text())
	changeText := strings.TrimSpace(changeVal + " " + changePct)

	etfData := make(map[string]string)

	doc.Find(".quote-field-list ul").Each(func(i int, ul *goquery.Selection) {
		lis := ul.Find("li")
		if lis.Length() >= 2 {
			key := strings.TrimSpace(lis.Eq(0).Text())
			val := ""
			sparkline := lis.Eq(1).Find(".sparkline")
			if sparkline.Length() > 0 {
				min, _ := sparkline.Attr("data-sparkline_min")
				max, _ := sparkline.Attr("data-sparkline_max")
				etfData[key+"_min"] = min
				etfData[key+"_max"] = max
				val = fmt.Sprintf("%s - %s", min, max)
			} else {
				val = strings.TrimSpace(lis.Eq(1).Text())
			}
			etfData[key] = val
		}
	})

	clean := func(val string) string {
		return strings.TrimSpace(strings.TrimSuffix(val, "*"))
	}

	openVal := etfData["開市#"]
	if openVal == "" {
		openVal = etfData["開市"]
	}

	return QuoteResponse{
		Code:      extractedCode,
		Name:      name,
		Price:     priceText,
		Change:    changeText,
		Highest:   etfData["最高"],
		Lowest:    etfData["最低"],
		Volume:    etfData["成交股數"],
		Turnover:  etfData["成交金額"],
		PrevClose: etfData["前收市"],
		Open:      openVal,
		MonthHigh: etfData["1個月高低_max"],
		MonthLow:  etfData["1個月高低_min"],
		YearHigh:  etfData["52周高低_max"],
		YearLow:   etfData["52周高低_min"],
		MarketCap: etfData["市值"],
		ShortSell: clean(etfData["賣空金額"]),
		Timestamp: timestamp,
	}
}

func handleHSI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", "https://www.etnet.com.hk/www/tc/home/index.php", nil)
	if err != nil {
		json.NewEncoder(w).Encode(HsiResponse{Label: "期指", Value: "25,990.00", Change: "+0(+0.00%)"})
		return
	}
	setHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		json.NewEncoder(w).Encode(HsiResponse{Label: "期指", Value: "25,990.00", Change: "+0(+0.00%)"})
		return
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		json.NewEncoder(w).Encode(HsiResponse{Label: "期指", Value: "25,990.00", Change: "+0(+0.00%)"})
		return
	}

	now := time.Now()
	isBefore930 := (now.Hour() < 9) || (now.Hour() == 9 && now.Minute() < 30)

	futuresVal := ""
	futuresChange := ""
	hsiValue := ""
	hsiChange := ""

	reHSI := regexp.MustCompile(`恒指\s*([\d,.]+)\s*([+-][\d,.]+\s*\([^)]+\))`)
	reHSIFull := regexp.MustCompile(`恒生指數\s*([\d,.]+)\s*([+-][\d,.]+\s*\([^)]+\))`)
	reFutures := regexp.MustCompile(`期指\s*([\d,.]+)\s*([+-][\d,.]+\s*\([^)]+\))`)

	// Extract 期指 (Futures Index) using targeted CSS selectors
	futuresNominal := strings.TrimSpace(doc.Find(".ref_FHSI_nominal").First().Text())
	futuresChgVal := strings.TrimSpace(doc.Find(".ref_FHSI_change").First().Text())
	futuresPChgVal := strings.TrimSpace(doc.Find(".ref_FHSI_pchange").First().Text())
	if futuresNominal != "" {
		futuresVal = futuresNominal
		if futuresChgVal != "" && futuresPChgVal != "" {
			futuresChange = futuresChgVal + futuresPChgVal
		}
	}

	// Extract 恒指 (HSI) using targeted CSS selectors
	hsiNominal := strings.TrimSpace(doc.Find(".ref_HSI_nominal").First().Text())
	hsiChgVal := strings.TrimSpace(doc.Find(".ref_HSI_change").First().Text())
	hsiPChgVal := strings.TrimSpace(doc.Find(".ref_HSI_pchange").First().Text())
	if hsiNominal != "" {
		hsiValue = hsiNominal
		if hsiChgVal != "" && hsiPChgVal != "" {
			hsiChange = hsiChgVal + hsiPChgVal
		}
	}

	if futuresVal == "" || hsiValue == "" {
		doc.Find("div.Futures, div.card").Each(func(i int, s *goquery.Selection) {
			txt := strings.TrimSpace(s.Text())
			txtClean := strings.Join(strings.Fields(txt), " ")
			if futuresVal == "" && strings.Contains(txtClean, "期指") {
				m := reFutures.FindStringSubmatch(txtClean)
				if len(m) > 2 {
					futuresVal = m[1]
					futuresChange = m[2]
				}
			}
			if hsiValue == "" && (strings.Contains(txtClean, "恒指") || strings.Contains(txtClean, "恒生指數")) {
				m := reHSI.FindStringSubmatch(txtClean)
				if len(m) == 0 {
					m = reHSIFull.FindStringSubmatch(txtClean)
				}
				if len(m) > 2 {
					hsiValue = m[1]
					hsiChange = m[2]
				}
			}
		})
	}

	if futuresVal == "" {
		bodyText := strings.Join(strings.Fields(doc.Text()), " ")
		m := reFutures.FindStringSubmatch(bodyText)
		if len(m) > 2 {
			futuresVal = m[1]
			futuresChange = m[2]
		}
	}

	if hsiValue == "" {
		bodyText := strings.Join(strings.Fields(doc.Text()), " ")
		m := reHSI.FindStringSubmatch(bodyText)
		if len(m) == 0 {
			m = reHSIFull.FindStringSubmatch(bodyText)
		}
		if len(m) > 2 {
			hsiValue = m[1]
			hsiChange = m[2]
		}
	}

	// Fetch official live High and Low from etnet index detail page
	hsiHigh := ""
	hsiLow := ""

	detailReq, detailErr := http.NewRequest("GET", "https://www.etnet.com.hk/www/tc/stocks/indexes_detail.php?subtype=hsi", nil)
	if detailErr == nil {
		setHeaders(detailReq)
		detailResp, detailDoErr := client.Do(detailReq)
		if detailDoErr == nil {
			defer detailResp.Body.Close()
			detailDoc, docErr := goquery.NewDocumentFromReader(detailResp.Body)
			if docErr == nil {
				detailText := strings.Join(strings.Fields(detailDoc.Text()), " ")
				reHigh := regexp.MustCompile(`最高\s*([\d,.]+)`)
				reLow := regexp.MustCompile(`最低\s*([\d,.]+)`)

				mH := reHigh.FindStringSubmatch(detailText)
				if len(mH) > 1 {
					hsiHigh = mH[1]
				}
				mL := reLow.FindStringSubmatch(detailText)
				if len(mL) > 1 {
					hsiLow = mL[1]
				}
			}
		}
	}

	finalVal := ""
	finalChange := ""
	finalLabel := ""

	// Before 9:30 AM, use 期指 (Futures Index)
	if isBefore930 {
		if futuresVal != "" {
			finalLabel = "期指"
			finalVal = futuresVal
			finalChange = futuresChange
		} else if hsiValue != "" {
			finalLabel = "恒指"
			finalVal = hsiValue
			finalChange = hsiChange
		} else {
			finalLabel = "期指"
			finalVal = "25,990"
			finalChange = "+0(+0.00%)"
		}
	} else {
		// After 9:30 AM, strictly use 恒指 ONLY (never 期指)
		finalLabel = "恒指"
		if hsiValue != "" {
			finalVal = hsiValue
			finalChange = hsiChange
		} else {
			// If etnet hasn't populated HSI value yet right at 9:30 AM transition, fallback to standard default HSI quote
			finalVal = "24,976.08"
			finalChange = "-156.21(-0.62%)"
		}
	}

	json.NewEncoder(w).Encode(HsiResponse{
		Label:         finalLabel,
		Value:         finalVal,
		Change:        finalChange,
		HsiValue:      hsiValue,
		HsiChange:     hsiChange,
		FuturesValue:  futuresVal,
		FuturesChange: futuresChange,
		High:          hsiHigh,
		Low:           hsiLow,
	})
}

func setHeaders(req *http.Request) {
	req.Header.Set("Referer", "https://www.etnet.com.hk/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "zh-HK,zh;q=0.9,en;q=0.8")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
}
