import fetch from 'node-fetch'

let handler = async (m, { text, conn, usedPrefix, command }) => {
  if (!text && !(m.quoted && m.quoted.text)) {
    throw `Please provide some text or quote a message to get a response.`
  }

  if (!text && m.quoted && m.quoted.text) {
    text = m.quoted.text
  }

  try {
    m.react(rwait)
    
    conn.sendPresenceUpdate('composing', m.chat)
    const prompt = encodeURIComponent(text)

    const guru1 = `https://gtech-api-xtp1.onrender.com/api/gemini/flash?apikey=APIKEY&prompt=${prompt}`

    try {
      let response = await fetch(guru1)
      let data = await response.json()

      // Check if the response is valid and properly structured
      if (data.status && data.text && data.text.parts && data.text.parts[0] && data.text.parts[0].text) {
        let result = data.text.parts[0].text  // Correctly extract text from flash API

        if (!result) {
          throw new Error('No valid response from Gemini Flash API')
        }

        await conn.sendMessage(m.chat, { text: result }, { quoted: m })
        m.react(done)
      } else {
        throw new Error('Invalid response structure from Gemini Flash API')
      }
    } catch (error) {
      console.error('Error from Gemini Flash API:', error)

      const guru2 = `https://gtech-api-xtp1.onrender.com/api/gemini/ai?apikey=APIKEY&prompt=${prompt}`

      try {
        let response = await fetch(guru2)
        let data = await response.json()

        // Check if the response is valid and properly structured
        if (data.status && data.response) {
          let result = data.response  // Correctly extract text from AI API

          if (!result) {
            throw new Error('No valid response from Gemini AI API')
          }

          await conn.sendMessage(m.chat, { text: result }, { quoted: m })
          m.react(done)
        } else {
          throw new Error('Invalid response structure from Gemini AI API')
        }
      } catch (error) {
        console.error('Error from Gemini AI API:', error)
        throw `*ERROR*`
      }
    }
  } catch (error) {
    console.error('Error:', error)
    throw `*ERROR*`
  }
}

handler.help = ['chatgpt']
handler.tags = ['AI']
handler.command = ['bro', 'chatgpt', 'ai', 'gpt']

export default handler
