import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFuturesDetail() {
  try {
    const res = await axios.get('https://www.etnet.com.hk/www/tc/futures/index.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.etnet.com.hk/'
      }
    });
    const $ = cheerio.load(res.data);
    console.log('--- Futures table text ---');
    $('table, div.DivFigureBox, div.Futures').each((i, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim();
      if (t.includes('恒生指數期貨') || t.includes('期指')) {
        console.log(t.substring(0, 500));
      }
    });
  } catch (e) {
    console.error(e.message);
  }
}
testFuturesDetail();
