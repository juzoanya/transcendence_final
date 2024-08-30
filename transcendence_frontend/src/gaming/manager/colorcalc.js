function parseHexShort(inputArr) {
    const [, m] = inputArr
    if (!m) return null
    return [
      parseInt(m.charAt(0), 16) * 0x11,
      parseInt(m.charAt(1), 16) * 0x11,
      parseInt(m.charAt(2), 16) * 0x11
    ]
  }
  
  function parseHexNormal(inputArr) {
    const [, m] = inputArr
    if (!m) return null
    return [
      parseInt(m.substring(0, 2), 16),
      parseInt(m.substring(2, 4), 16),
      parseInt(m.substring(4, 6), 16)
    ]
  }
  
  function parseRGB(input) {
    const a = input.match(/\d+/g)
    if (!a) return null
    return [parseInt(a[0], 10), parseInt(a[1], 10), parseInt(a[2], 10)]
  }
  
  function parseColor(input) {
    let regArr
    let rgbArr = null
  
    regArr = input.match(/^#([0-9a-f]{3})$/i)
    if (regArr) rgbArr = parseHexShort(regArr)
    regArr = input.match(/^#([0-9a-f]{6})$/i)
    if (regArr) rgbArr = parseHexNormal(regArr)
    regArr = input.match(/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)\s*/)
    if (regArr) rgbArr = parseRGB(input)
  
    if (rgbArr) return rgbArr.map(e => Math.max(0, Math.min(e, 255)))
    return undefined
  }
  
  function rgbArrToHex(a) {
    if (!a) return undefined
    let hex = "#"
    hex +=
      a[0].toString(16).length < 2 ? `0${a[0].toString(16)}` : a[0].toString(16)
    hex +=
      a[1].toString(16).length < 2 ? `0${a[1].toString(16)}` : a[1].toString(16)
    hex +=
      a[2].toString(16).length < 2 ? `0${a[2].toString(16)}` : a[2].toString(16)
    return hex
  }
  
  export function colorLighting(color, dimmedVal) {
    let arr = parseColor(color)
    if (!arr) return null
  
    const dimmedCalc =
      dimmedVal > 0 ? 1 + dimmedVal / 100 : 1 - Math.abs(dimmedVal) / 100
    arr = arr.map(e => Math.round(Math.max(0, Math.min(e * dimmedCalc, 255))))
    return rgbArrToHex(arr)
  }
  
  class Rgb {
    #sRgbArr
  
    #linearRgbArr
  
    #lum
  
    constructor(color, gamma) {
      this.#sRgbArr = parseColor(color)?.map(v => v / 255)
      this.#linearRgbArr = this.#sRgbArr?.map(v => Rgb.sRgbTolinRgb(v, gamma))
      this.luminance()
    }
  
    static sRgbTolinRgb(v, gamma) {
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** gamma
    }
  
    static linRgbTosRgb(v, gamma) {
      return v <= 0.0031308 ? v * 12.92 : (1.055 * v) ** (1 / gamma) - 0.055
    }
  
    luminance() {
      if (this.#lum) return this.#lum
      if (this.#linearRgbArr) {
        const RED = 0.2126
        const GREEN = 0.7152
        const BLUE = 0.0722
        this.#lum =
          this.#linearRgbArr[0] * RED +
          this.#linearRgbArr[1] * GREEN +
          this.#linearRgbArr[2] * BLUE
      }
      return this.#lum
    }
  
    static getContrastColor(lumin, gamma) {
      let contr
  
      if (lumin === undefined || lumin < 0 || lumin > 1) return undefined
      if (lumin < Rgb.sRgbTolinRgb(0.5, 2.4)) {
        contr = Rgb.linRgbTosRgb((lumin + 0.05) * 15 - 0.05, gamma)
      } else {
        contr = Rgb.linRgbTosRgb((lumin + 0.05) / 8 - 0.05, gamma)
      }
      contr = Math.round(Math.max(0, Math.min(contr * 255, 255)))
      return [contr, contr, contr]
    }
  }
  
  /** @param {string} color  */
  export function calcContrastColor(color) {
    const rgb = new Rgb(color, 2.4)
    const bla = Rgb.getContrastColor(rgb.luminance(), 2.4)
    const hex = rgbArrToHex(bla)
    return hex
  }
  