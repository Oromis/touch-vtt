const path = require('path')

module.exports = {
  entry: './src/touch-vtt.js',
  output: {
    filename: 'touch-vtt.js',
    path: path.resolve(__dirname, 'dist'),
  },
}
