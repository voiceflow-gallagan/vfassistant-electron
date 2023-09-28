const { ipcRenderer } = require('electron')
const log = require('electron-log/renderer')
const marked = require('marked')
const search = document.getElementById('search')
const responseContainer = document.getElementById('response-container')
const response = document.getElementById('response')
const placeholder = document.getElementById('placeholder')
const config = require('./config.json')

let { width, delay } = config
const $ = require('jquery')

response.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  ipcRenderer.send('show-context-menu')
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

  const htmlString = marked.parse(
    results.messages[0].replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, '')
  )

  response.innerHTML = htmlString

  responseContainer.classList.add('fade-in')

  let lineHeight = 5
  let charWidth = 6
  let charactersPerLine = Math.floor(width / charWidth)
  let lines = Math.ceil(htmlString.length / charactersPerLine)
  let newHeight =
    document.body.getBoundingClientRect().height + lines * lineHeight + 20

  function processNode(node) {
    if (
      node.nodeType === Node.TEXT_NODE &&
      !['code', 'strong', 'a'].some((tag) => node.parentNode.closest(tag))
    ) {
      const words = node.textContent
        .split(' ')
        .map((word) => `<span style="display: none">${word}</span> `)
      const newNode = document.createElement('span')
      newNode.innerHTML = words.join('')
      node.parentNode.replaceChild(newNode, node)
    } else if (
      node.nodeType === Node.ELEMENT_NODE &&
      ['code', 'strong', 'a'].includes(node.tagName.toLowerCase())
    ) {
      const newNode = document.createElement('span')
      newNode.style.display = 'none'
      newNode.innerHTML = node.outerHTML
      node.parentNode.replaceChild(newNode, node)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        processNode(node.childNodes[i])
      }
    }
  }

  processNode(response)

  // Get all the spans in the response
  const spans = $('#response span')

  // Calculate the total animation time
  const totalAnimationTime = spans.length * (delay / 10)

  ipcRenderer.send('anim-resize-window', {
    targetWidth: width,
    targetHeight: newHeight,
    duration: totalAnimationTime * 0.9,
  })

  // Animate each word
  spans.each((index, span) => {
    setTimeout(() => {
      $(span).fadeIn(delay)
    }, index * (delay / 10))
  })
  // Wait for the animations to end before revealing the non-treated tags
  setTimeout(() => {
    $('code, strong, span').css('display', '')
    // Re-attach the onclick event handler to the 'a' tags
    $('a').attr(
      'onclick',
      `event.preventDefault(); ipcRenderer.send('open-link', this.href)`
    )
  }, totalAnimationTime)

  // Wait for the animations to end before adding 'fade-in' class and focusing the search
  setTimeout(() => {
    search.classList.add('fade-in')
    search.focus()
  }, totalAnimationTime)
})

document.addEventListener('DOMContentLoaded', (event) => {
  search.addEventListener('blur', function () {
    if (this.value) {
      placeholder.textContent = ''
    } else {
      placeholder.textContent = getRandomPlaceholder()
    }
  })

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

      // Reset the search input
      e.target.value = ''

      // Send the question to the main process for searching
      ipcRenderer.send('perform-search', question)
    }
  })
  log.info('Voiceflow Spotlight loaded')
  placeholder.textContent = getRandomPlaceholder()
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

function getRandomPlaceholder() {
  return placeholderTexts[Math.floor(Math.random() * placeholderTexts.length)]
}
