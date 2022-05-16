import { extract } from 'article-parser';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import gulp from 'gulp';
import md5 from 'md5';
import Parser from 'rss-parser';
import { join } from 'upath';
import yaml from 'yaml';
import configData from './src/types/_config.json';

const parser = new Parser();
const configYml = join(__dirname, '_config.yml');
const configYmlRead = readFileSync(configYml, 'utf-8');
const config: typeof configData = yaml.parse(configYmlRead);
writeFileSync(join(__dirname, 'src/types/_config.json'), JSON.stringify(config, null, 2));
const destDir = join(__dirname, config.source_dir, '_posts');
if (existsSync(destDir)) rmSync(destDir, { recursive: true });
if (!existsSync(destDir)) mkdirSync(destDir);

gulp.task('parse', async () => {
  const feed = await parser.parseURL('https://www.webmanajemen.com/rss.xml');
  //console.log(feed.title);
  for (let i = 0; i < feed.items.length; i++) {
    const item = feed.items[i];
    const post = {
      metadata: {
        title: '',
        description: '',
        author: 'dimaslanjaka@gmail.com (Dimas lanjaka)',
        url: '',
        date: String(new Date()),
        updated: String(new Date()),
        photos: []
      },
      body: ''
    };
    if (item.title) post.metadata.title = item.title;
    if (item.summary) {
      post.metadata.description = item.summary;
    } else if (item.contentSnippet) {
      post.metadata.description = item.contentSnippet;
    }
    if (item.creator) {
      post.metadata.author = item.creator;
    }
    if (item.isoDate) {
      post.metadata.date = post.metadata.updated = item.isoDate;
    } else if (item.pubDate) {
      post.metadata.date = post.metadata.updated = item.pubDate;
    }
    //if (item.title.toLowerCase().includes('xampp'))
    if (item.link) {
      const readMore = `<hr/> Skip to Full Contents <a href="${item.link}" rel="follow" class="button" id="read-more">Read More</a> <hr/>`;
      const parseUrl = new URL(item.link);
      let buildPost = '';
      post.metadata.url = item.link;
      try {
        console.log(`extracting ${item.link}`);
        const article = await extract(item.link);
        if (!article) {
          console.log(`cannot parse ${item.link}`);
          post.body = `${readMore} ${item['content:encodedSnippet']} ${readMore}`;
        } else {
          if (article.description) post.metadata.description = article.description;
          if (article.title) post.metadata.title = article.title;
          if (article.published) post.metadata.date = article.published;
          if (article.author) post.metadata.author = article.author;
          if (article.image) post.metadata.photos.push(article.image);
          post.body = `${readMore} ${article.title} - ${article.description} ${item['content:encodedSnippet']} ${readMore}`;
        }
        buildPost = `---\n${yaml.stringify(post.metadata)}---\n\n${post.body}`;
        const saveTo = join(destDir, md5(parseUrl.pathname) + '.md');
        writeFileSync(saveTo, buildPost);
      } catch (error) {
        console.log(error);
      }
    }
  }
});
