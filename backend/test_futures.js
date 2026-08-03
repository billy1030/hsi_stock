import axios from 'axios';
import * as cheerio from 'cheerio';

async function testFutures() {
  try {
    const res = await axios.get('https://www.etnet.com.hk/www/tc/futures/index.php', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.etnet.com.hk/'
      }
    });
    const $ = cheerio.load(res.data);
    console.log('--- Futures Body text preview ---');
    console.log($('body').text().replace(/\s+/g, ' ').substring(0, 2000));
  } catch (e) {
    console.error(e.message);
  }
}
testFutures();
