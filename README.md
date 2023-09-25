# vf-assistant-electron-spotlight

vf-assistant-electron-spotlight is a sample Electron application that uses the Voiceflow Dialog API to interact with your assistant. You can ask it questions in a search bar and it will provide answers using LLM and/or your Voiceflow Knowledge Base.

## Features

- Spotlight app using Voiceflow Dialog API
- Text animations and markdown support
- Opens external links in a preview window or default browser
- Resizes window based on response content
- Uses machine ID for unique user sessions
- Support transcripts

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.js and npm. You can download them [here](https://nodejs.org/).
- You have a Voiceflow Assistant or you can use the demo one from here: https://creator.voiceflow.com/dashboard?import=64f5cf1099d6da00085c97e8

## Installation

1. Clone this repository:

```
git clone https://github.com/your-username/vf-assistant-electron-spotlight.git
```

2. Navigate to the project directory:

```
cd vf-assistant-electron-spotlight
```

3. Install the dependencies:

```
npm install
```

4. Create a `.env` or rename the `env.template` file in the root of the project and add your Voiceflow API key:

```
VOICEFLOW_API_KEY = VF.DM.XXXX
```

5. Update the `config.json` file with your project and version ID from Voiceflow:

```json
{
  "projectID": "your-voiceflow-project-id", // only needed if you want to save transcripts
  "versionID": "development", // or "production"
  "width": 800, // width of the window
  "delay": 800, // delay in ms for the animations
  "shortcut": "Command+T", // shortcut to show/hide the window
  "openURL": "preview" // "preview" or any other value to open links in the default browser
}
```

## Usage

To start the application, run:

```
npm start
```

You can then use the configured shortcut (Command+T by default) to show and hide the assistant window. Type a question into the search bar and press Enter to get an answer.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Voiceflow Discord

We can talk about this project on Discord
https://discord.gg/9JRv5buT39
