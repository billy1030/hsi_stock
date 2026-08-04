import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFuturesDetail() {
  try {
    const res = await axios.get('https://www.etnet.com.hk/www/tc/home/index.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    const fNominal = $('.ref_FHSI_nominal').first().text().trim();
    const fChange = $('.ref_FHSI_change').first().text().trim();
    const fPChange = $('.ref_FHSI_pchange').first().text().trim();
    console.log('Parsed FHSI single:', fNominal, fChange, fPChange);

    const hNominal = $('.ref_HSI_nominal').text().trim();
    const hChange = $('.ref_HSI_change').text().trim();
    const hPChange = $('.ref_HSI_pchange').text().trim();
    console.log('Parsed HSI:', hNominal, hChange, hPChange);
  } catch (e) {
    console.error(e.message);
  }
}
testFuturesDetail();

