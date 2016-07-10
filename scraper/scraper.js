let fs = require('fs');
let request = require('request');
let cheerio = require('cheerio');
let utils = require('../lib/common');

const base_url = 'http://www.dotabuff.com';
const query_type = 'heroes';

let content = JSON.parse(fs.readFileSync('./heroes.json'));
let heroURLs = [];
content.heroes.forEach((e,i) => {
  let hero = utils.rawString(e.localized_name).replace(/\s/g, "-");
  heroURLs.push({
    url: `${base_url}/${query_type}/${hero}/abilities`,
    hero: hero,
  });
});

let heroes = [];
let failures = 0;

heroURLs.forEach((e,i,a) => {
  let opts = {
    url: e.url,
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  };
  request(opts, (err, resp, html) => {
    if (err) {
      console.log(err);
      return;
    }
    let $ = cheerio.load(html);
    let heroSkills = [];
    if ($('.col-8').text() === '') {
      console.log(`Grabbing data failed for ${e.hero}`);
      failures++;
    }
    // grabs skills
    $('.col-8 section').each((index, elem) => {
      let skillName = $(elem).find('header').contents().filter((index, elem) => {
        return elem.type === 'text';
      }).text();

      let skillStats = [];
      let $stats = $(elem).find('article');
      $stats.find('.stats .stat').each((index, elem) => {
        let label = $(elem).find('.label').text().replace(":", "");
        let values = [];
        $(elem).find('.values .value').each((index, elem) => {
          values.push($(elem).text());
        });
        skillStats.push({label, values});
      });
      let manacost = [];
      $stats.find('.cooldown .number').each((index, elem) => {
        manacost.push($(elem).text());
      });
      let cooldown = [];
      $stats.find('.manacost .number').each((index, elem) => {
        cooldown.push($(elem).text());
      });
      skillStats.push({manacost});
      skillStats.push({cooldown});
      heroSkills.push({
        name: skillName,
        stats: skillStats,
      });
    });

    $('.col-8 .hero_attributes other tr').each((index, elem) => {
      console.log(elem);
    });

    heroes.push({
      hero: e.hero,
      skills: heroSkills,
    });
  });
  if (heroes.length === heroURLs.length - failures) {
    let out = JSON.stringify(heroes, null, 4);
    fs.writeFileSync("skills.json", out);
  }
});
