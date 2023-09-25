const { ipcRenderer } = require('electron')
const log = require('electron-log/renderer')
const marked = require('marked')
const search = document.getElementById('search')
const responseContainer = document.getElementById('response-container')
const response = document.getElementById('response')
const placeholder = document.getElementById('placeholder')
const config = require('./config.json')
const tokenize = require('html-tokenize')
const cheerio = require('cheerio')
let { width, delay } = config
const $ = require('jquery')

response.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  ipcRenderer.send('show-context-menu')
})

search.addEventListener('blur', function () {
  if (this.value) {
    placeholder.textContent = ''
  } else {
    placeholder.textContent = getRandomPlaceholder()
  }
})

ipcRenderer.on('focus-search-input', () => {
  search.focus()
})

ipcRenderer.on('animate-window', (event, direction) => {
  if (direction === 'in') {
    if (!search.value) {
      search.blur()
      placeholder.textContent = getRandomPlaceholder()
    }
    document.body.style.opacity = 1
  } else if (direction === 'out') {
    document.body.style.opacity = 0
    setTimeout(() => {
      ipcRenderer.send('animation-finished')
    }, 100)
  }
})

ipcRenderer.on('reload-window', () => {
  // Resize to default size
  ipcRenderer.send('resize-window', { width: width, height: 80 })
  // Fade out
  document.body.style.opacity = 0
  setTimeout(() => {
    // Fade in
    document.body.style.opacity = 1
  }, delay)
})

ipcRenderer.on('search-results', (event, results) => {
  responseContainer.classList.remove('fade-in')
  log.info(results.messages[0])
  let htmlString = marked.parse(
    results.messages[0].replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, '')
  )
  response.innerHTML = htmlString
  //delay = results.delay * 1000
  responseContainer.classList.add('fade-in')

  let lineHeight = 5
  let charWidth = 6
  let charactersPerLine = Math.floor(width / charWidth)
  let lines = Math.ceil(results.messages[0].length / charactersPerLine)
  let newHeight =
    document.body.getBoundingClientRect().height + lines * lineHeight + 20

  response.innerHTML = ''

  // Load the HTML string into Cheerio
  const html = cheerio.load(htmlString)

  // Traverse each text node
  html('*')
    .contents()
    .each(function () {
      if (this.type === 'text') {
        // Split the text into words and wrap each word in a span
        const words = this.data.split(' ').map((word, i, arr) => {
          // If the next word starts with a <, don't add a space after this word
          const space =
            i < arr.length - 1 && arr[i + 1].startsWith(' <') ? '' : ' '
          return `<span style="display: none">${word}</span>${space}`
        })

        // Replace the text node with the spans
        html(this).replaceWith(words.join(''))
      } else if (this.type === 'tag' && this.name === 'a') {
        // Add the event listener to the link
        html(this).attr(
          'onclick',
          `event.preventDefault(); ipcRenderer.send('open-link', this.href)`
        )
      }
    })

  // Insert the HTML content into the DOM
  response.innerHTML = html('body').html()

  // Get all the spans in the response
  const spans = $('#response span')

  // Calculate the total animation time
  const totalAnimationTime = spans.length * (delay / 10)

  ipcRenderer.send('anim-resize-window', {
    targetWidth: width,
    targetHeight: newHeight,
    duration: totalAnimationTime * 0.95,
  })

  // Animate each word
  spans.each((index, span) => {
    setTimeout(() => {
      $(span).fadeIn(delay)
    }, index * (delay / 10))
  })
  // Wait for the animations to end before adding 'fade-in' class and focusing the search
  setTimeout(() => {
    search.classList.add('fade-in')
    search.focus()
  }, totalAnimationTime)
})

document.addEventListener('DOMContentLoaded', (event) => {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Control' && event.key !== 'Meta' && event.key !== 'c') {
      if (!search.isEqualNode(document.activeElement)) {
        search.focus()
      }
    }
  })
  document.querySelector('#search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const question = e.target.value
      placeholder.textContent = question
      search.classList.remove('fade-in')
      response.innerHTML = ''
      responseContainer.classList.remove('fade-in')
      ipcRenderer.send('resize-window', { width: width, height: 80 })

      search.blur()
      fadeOutIn(placeholder, 'Looking for an answer...')

      // Reset input field and adjust window size
      e.target.value = ''
      // Send the question to the main process for searching
      ipcRenderer.send('perform-search', question)
    }
  })
  search.blur()
  log.info('Spotlight loaded')
})

function fadeOutIn(element, newText) {
  let opacity = 1
  const fadeOut = () => {
    opacity -= 0.08
    if (opacity > 0) {
      element.style.opacity = opacity
      requestAnimationFrame(fadeOut)
    } else {
      element.textContent = newText
      fadeIn()
    }
  }
  const fadeIn = () => {
    opacity += 0.08
    if (opacity < 1) {
      element.style.opacity = opacity
      requestAnimationFrame(fadeIn)
    }
  }
  fadeOut()
}

// Define your array of placeholder texts
const placeholderTexts = [
  'Ask me anything...',
  'What do you need to know?',
  'Feel free to ask...',
  'Need help with something?',
  'Got a question?',
  // Add as many as you want...
]

// Function to get random placeholder
function getRandomPlaceholder() {
  return placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)]
}
