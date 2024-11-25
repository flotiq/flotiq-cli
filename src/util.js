function ucFirst(str) {
  return str[0].toUpperCase() + str.substring(1)
}

function camelize(str) {
  return str
    .replace(/(^|[_]+)([a-z])/g, (match, underscore, letter) => letter.toUpperCase());
}

module.exports = {
  ucFirst,
  camelize,
}
