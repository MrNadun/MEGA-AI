import fetch from 'node-fetch';
import pkg from 'api-qasim'; // Import ytmp4 from api-qasim package
import yts from 'youtube-yts';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import os from 'os';
const { ytmp4 } = pkg;

const streamPipeline = promisify(pipeline);

const handler = async (m, { conn, command, text, args, usedPrefix }) => {
  if (!text) throw `give a text to search Example: *${usedPrefix + command}* sefali odia song`;
  conn.ultra = conn.ultra ? conn.ultra : {};
  await conn.reply(m.chat, wait, m);
  const result = await searchAndDownloadMusic(text);
  const infoText = `✦ ──『 *ULTRA PLAYER* 』── ⚝ \n\n [ ⭐ Reply the number of the desired search result to get the Audio]. \n\n`;

  const orderedLinks = result.allLinks.map((link, index) => {
    const sectionNumber = index + 1;
    const { title, url } = link;
    return `*${sectionNumber}.* ${title}`;
  });

  const orderedLinksText = orderedLinks.join('\n\n');
  const fullText = `${infoText}\n\n${orderedLinksText}`;
  const { key } = await conn.reply(m.chat, fullText, m);
  conn.ultra[m.sender] = {
    result,
    key,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, {
        delete: key,
      });
      delete conn.ultra[m.sender];
    }, 150 * 1000),
  };
};

handler.before = async (m, { conn }) => {
  conn.ultra = conn.ultra ? conn.ultra : {};
  if (m.isBaileys || !(m.sender in conn.ultra)) return;
  const { result, key, timeout } = conn.ultra[m.sender];

  if (!m.quoted || m.quoted.id !== key.id || !m.text) return;
  const choice = m.text.trim();
  const inputNumber = Number(choice);
  if (inputNumber >= 1 && inputNumber <= result.allLinks.length) {
    const selectedUrl = result.allLinks[inputNumber - 1].url;
    console.log('selectedUrl', selectedUrl);
    
    try {
      // Fetch video details using ytmp4
      const response = await ytmp4(selectedUrl);
      
      // Validate response and ensure we have a video URL
      if (!response || !response.video) {
        throw new Error('No video URL found.');
      }
      const videoUrl = response.video;

      // Fetch video file buffer using retry logic
      const mediaResponse = await fetchWithRetry(videoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      const contentType = mediaResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('video')) {
        throw new Error('Invalid content type received');
      }

      const arrayBuffer = await mediaResponse.arrayBuffer();
      const mediaBuffer = Buffer.from(arrayBuffer);
      if (mediaBuffer.length === 0) throw new Error('Downloaded file is empty');

      // Send the video file with the relevant caption
      const caption = `*Title:* ${response.title || 'No Title'}\n` +
                      `*Author:* ${response.author || 'Unknown'}\n` +
                      `*Duration:* ${response.duration || 'Unknown'}\n` +
                      `*Views:* ${response.views || '0'}\n` +
                      `*Uploaded on:* ${response.upload || 'Unknown Date'}`;

      await conn.sendFile(m.chat, mediaBuffer, 'video.mp4', caption, m, false, {
        mimetype: 'video/mp4',
        thumbnail: response.thumbnail,
      });
    } catch (error) {
      console.error('Error fetching video:', error.message);
      await m.reply('An error occurred while fetching the video. Please try again later.');
      await m.react('❌');
    }
  } else {
    m.reply(
      'Invalid sequence number. Please select the appropriate number from the list above.\nBetween 1 to ' +
        result.allLinks.length
    );
  }
};

handler.help = ['play'];
handler.tags = ['downloader'];
handler.command = ['playvid', 'vidsong', 'ytvplay'];
export default handler;

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function searchAndDownloadMusic(query) {
  try {
    const { videos } = await yts(query);
    if (!videos.length) return 'Sorry, no video results were found for this search.';

    const allLinks = videos.map(video => ({
      title: video.title,
      url: video.url,
    }));

    const jsonData = {
      title: videos[0].title,
      description: videos[0].description,
      duration: videos[0].duration,
      author: videos[0].author.name,
      allLinks: allLinks,
      videoUrl: videos[0].url,
      thumbnail: videos[0].thumbnail,
    };

    return jsonData;
  } catch (error) {
    return 'Error: ' + error.message;
  }
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    console.log(`Retrying... (${i + 1})`);
  }
  throw new Error('Failed to fetch media content after retries');
        }
