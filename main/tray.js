const { Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');

let tray = null;

const FEEDBACK_URL = 'https://forms.gle/tWUenJWkG36vPawc7'; // 🔁 Replace
const GITHUB_URL = 'https://github.com/puneetk0';      // 🔁 Replace

function createTray(toggleFn) {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');

  let icon = nativeImage.createFromPath(iconPath);
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 18, height: 18 });
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('Camber');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Give Feedback', click: () => shell.openExternal(FEEDBACK_URL) },
    { label: 'GitHub', click: () => shell.openExternal(GITHUB_URL) },
    { type: 'separator' },
    { label: 'Quit Camber', click: () => require('electron').app.quit() },
  ]);

  // Set the context menu — on macOS this typically shows on right-click
  tray.setContextMenu(contextMenu);

  // Handle left-click for toggling
  tray.on('click', () => {
    toggleFn();
  });

  return tray;
}

module.exports = { createTray };