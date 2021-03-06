const {app, BrowserWindow} = require('electron');

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hidden-inset',
    autoHideMenuBar: true // Hide menu bar on windows, unless Alt is pressed
  });

  win.on('ready-to-show', () => {
    win.show();
  });

  win.loadURL(`file://${__dirname}/index.html`);

  win.on('closed', () => {
    win = null
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  };
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  };
});
