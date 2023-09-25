require('dotenv').config()
const {
  app,
  BrowserWindow,
  globalShortcut,
  session,
  ipcMain,
  Menu,
  shell,
} = require('electron')
const path = require('path')
const { URL } = require('url')
const axios = require('axios')
const log = require('electron-log/main')
const os = require('os')
const machineId = require('node-machine-id')

// Load the config.json file
const config = require('./config.json')

// Get apiKey from .env
const apiKey = process.env.VOICEFLOW_API_KEY

// Parse config.json
const { projectID, versionID, width, delay, shortcut, openURL } = config

// Get the machine ID
const userID = machineId.machineIdSync()
const username = os.userInfo().username

// Optional, initialize the logger for any renderer process
log.initialize({ preload: true })

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let win, newWin

//saveSettings(config)

ipcMain.on('anim-resize-window', (event, arg) => {
  let start = Date.now()
  let { width, height } = win.getBounds()

  let widthIncrease = arg.targetWidth - width
  let heightIncrease = arg.targetHeight - height

  let duration = arg.duration || 1000

  let interval = setInterval(() => {
    let now = Date.now()
    let progress = Math.min(1, (now - start) / duration)

    let newWidth = width + widthIncrease * progress
    let newHeight = height + heightIncrease * progress

    win.setBounds({
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    })

    if (progress === 1) {
      clearInterval(interval)
    }
  }, 10)
})

ipcMain.on('resize-window', (event, arg) => {
  win.setSize(arg.width, arg.height)
})

if (openURL == 'preview') {
  // Open external links in preview window
  ipcMain.on('open-link', (event, url) => {
    newWin = new BrowserWindow({
      width: 800,
      height: 600,
      frame: true,
      alwaysOnTop: true,
      title: 'Tico',
      skipTaskbar: true,
      autoHideMenuBar: true,
      darkTheme: true,
      visualEffectState: 'inactive',
      vibrancy: 'titlebar',
      webPreferences: { nodeIntegration: false },
    })
    newWin.loadURL(url)

    newWin.on('closed', () => {
      newWin = null
    })
  })
} else {
  // Open external links in default browser
  ipcMain.on('open-link', (event, url) => {
    shell.openExternal(url)
  })
}

// Right click context menu
ipcMain.on('show-context-menu', (event) => {
  const menuRC = Menu.buildFromTemplate([
    {
      label: 'Copy',
      role: 'copy',
    },
  ])

  menuRC.popup(BrowserWindow.fromWebContents(event.sender))
})

ipcMain.on('perform-search', async (event, question) => {
  try {
    const response = await axios.post(
      `https://general-runtime.voiceflow.com/state/user/${userID}/interact?verbose=true`,
      {
        action: {
          type: 'text',
          payload: question,
        },
        config: {
          tts: false,
          stripSSML: false,
          stopAll: true,
          excludeTypes: ['path', 'debug', 'flow', 'block'],
        },
      },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          versionID: versionID,
        },
      }
    )
    let isEnding = response.data.trace.some((item) => item.type === 'end')
    const messages = extractMessages(response.data.trace)
    //const delay = response.data.state.variables.number
    win.webContents.send('search-results', { messages, delay })
    if (isEnding) {
      saveTranscript()
    }
  } catch (error) {
    log.error(error)
  }
})

function extractMessages(response) {
  let messages = response
    .filter((item) => item.type === 'text')
    .map((item) => item.payload.message)
  return messages
}

// Create spotlight window
function createWindow() {
  win = new BrowserWindow({
    show: false,
    width: width,
    height: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // Set default menu
  const template = [
    {
      label: app.getName(),
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Assistant',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            win.webContents.send('reload-window')
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  win.loadFile(path.join(__dirname, 'main.html'))
}

// Start the app
app
  .whenReady()
  .then(createWindow)
  .then(() => {
    // Register a shortcut listener.
    globalShortcut.register(shortcut, () => {
      if (win.isVisible()) {
        ipcMain.emit('hide-window')
      } else {
        ipcMain.emit('show-window')
      }
    })
    ipcMain.emit('show-window')
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('show-window', () => {
  win.webContents.send('animate-window', 'in')
  win.show()
  setTimeout(() => {
    win.webContents.send('focus-search-input')
  }, 3000)
})

ipcMain.on('hide-window', () => {
  win.webContents.send('animate-window', 'out')
})

ipcMain.on('animation-finished', () => {
  win.hide()
})

async function saveSettings(config) {
  try {
    const response = await axios.patch(
      `https://general-runtime.voiceflow.com/state/user/${userID}/variables`,
      {
        responseFormat: config.responseFormat,
      },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          VersionID: versionID,
        },
      }
    )
  } catch (error) {
    console.error(error)
  }
}

async function saveTranscript() {
  if (projectID) {
    if (!username || username == '' || username == undefined) {
      username = 'Anonymous'
    }
    axios({
      method: 'put',
      url: 'https://api.voiceflow.com/v2/transcripts',
      data: {
        browser: 'Electron',
        device: 'desktop',
        os: os.type() || 'Unknown',
        sessionID: userID, //session,
        unread: true,
        versionID: versionID,
        projectID: projectID,
        user: {
          name: username,
        },
      },
      headers: {
        Authorization: apiKey,
      },
    })
      .then(function (response) {
        log.info('Transcript Saved!')
      })
      .catch((err) => console.log(err))
  }
}
