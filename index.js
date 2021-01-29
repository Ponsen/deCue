/*
const sdk = require('cue-sdk');

const details = sdk.CorsairPerformProtocolHandshake();
const errCode = sdk.CorsairGetLastError();
if (errCode === 0) {
    // 'CE_Success'
}

const n = sdk.CorsairGetDeviceCount();

for (let i = 0; i < n; ++i) {
    const info = sdk.CorsairGetDeviceInfo(i);

    // example: read device properties
    if (info.capsMask & sdk.CorsairDeviceCaps.CDC_PropertyLookup) {
        console.log(info);
        Object.keys(sdk.CorsairDevicePropertyId).forEach(p => {
            const prop = sdk.CorsairGetDeviceProperty(i, sdk.CorsairDevicePropertyId[p]);
            if (!prop) {
                console.log(p, ':', sdk.CorsairErrorString[sdk.CorsairGetLastError()]);
            } else {
                console.log(p, prop.value);
            }
        });
    }

    if (info.capsMask & sdk.CorsairDeviceCaps.CDC_Lighting) {
        const positions = sdk.CorsairGetLedPositionsByDeviceIndex(i);
        const maxX = positions.reduce((acc, curr) => Math.max(curr.left, acc), 0);
        // create red gradient
        const colors = positions.map(p => ({ ledId: p.ledId, r: Math.floor(p.left / maxX * 255), g: 0, b: 0 }));
        sdk.CorsairSetLedsColorsBufferByDeviceIndex(i, colors);
        sdk.CorsairSetLedsColorsFlushBuffer();
    }
}
*/
const { timeStamp } = require('console');
const sdk = require('cue-sdk');
const { getgroups } = require('process');
const readline = require('readline')
const input_queue = []
const request = require('request');

readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.on('keypress', (key, data) => {
  if (data.sequence === '\u0003') {
    // ^C
    exit()
  }
  input_queue.push(key)
})

function exit(code = 0) {
  console.log('Exiting.')
  process.exit(code)
}

function getAvailableLeds() {
  const leds = []
  const deviceCount = sdk.CorsairGetDeviceCount()
  for (let di = 0; di < deviceCount; ++di) {
    const ledPositions = sdk.CorsairGetLedPositionsByDeviceIndex(di)
    leds.push(ledPositions.map(p => ({ ledId: p.ledId, r: 0, g: 0, b: 0 })))

    sdk.CorsairGetLedsColorsByDeviceIndex(di, leds[di])
  }

  return leds
}

function getAverageColor(availableLeds) {
  console.log(availableLeds)
  let count = 0
  let r = 0
  let g = 0
  let b = 0
  for (let device of availableLeds) {
    for (let led of device) {
      r += led.r
      g += led.g
      b += led.b
      count++
    }
  }
  return {
    r: Math.floor(r / count),
    g: Math.floor(g / count),
    b: Math.floor(b / count)
  }
}

function discoverGateWay(url) {
  return new Promise((resolve, reject) => {
    request(url + "/discover", (error, response, body) => {
      if (error) reject(error);
      if (response.statusCode != 200) {
        reject('Invalid status code <' + response.statusCode + '>');
      }
      resolve(JSON.parse(body)[0]);
    });
  });
}

function getApiKey(gateWay) {
  return new Promise((resolve, reject) => {
    try {
      var options = {
        uri: `http://${gateWay.internalipaddress}:${gateWay.internalport}/api`,
        method: 'POST',
        json: {
          "devicetype": "my application"
        }
      };

      request.post(options, (error, response, body) => {
        if (error)
          return reject(error)
        if (response.statusCode != 200)
          return resolve('Invalid status code <' + response.statusCode + '>')

        //D25BD34CEE
        resolve(body[0].success.username);
      })
    } catch (error) {
      reject('Could not parse gateWay data <' + error + '>');
    }
  });
}

function getLights(gateWay, apiKey) {
  return new Promise((resolve, reject) => {
    var options = {
      uri: `http://${gateWay.internalipaddress}:${gateWay.internalport}/api/${apiKey}/lights`,
      method: 'GET'
    };

    request(options, (error, response, body) => {
      if (error) reject(error);
      if (response.statusCode != 200) {
        reject('Invalid status code <' + response.statusCode + '>');
      }
      resolve(JSON.parse(body));
    });
  });
}

function getGroups(gateWay, apiKey) {
  return new Promise((resolve, reject) => {
    var options = {
      uri: `http://${gateWay.internalipaddress}:${gateWay.internalport}/api/${apiKey}/groups`,
      method: 'GET'
    };

    request(options, (error, response, body) => {
      if (error)
        reject(error);
      if (response.statusCode != 200)
        reject('Invalid status code <' + response.statusCode + '>');

      const groups = JSON.parse(body)

      let result = new Array()
      for (var key of Object.keys(groups))
        result.push(groups[key])
      resolve(result);
    });
  });
}

function getGroupAttributes(gateWay, apiKey, groups) {
  

  return new Promise((resolve, reject) => {
    for (let item of groups) {
      var options = {
        uri: `http://${gateWay.internalipaddress}:${gateWay.internalport}/api/${apiKey}/groups/`,
        method: 'GET'
      };
  
      request(options, (error, response, body) => {
        if (error)
          reject(error);
        if (response.statusCode != 200)
          reject('Invalid status code <' + response.statusCode + '>');
  
        const groups = JSON.parse(body)
  
        let result = new Array()
        for (var key of Object.keys(groups))
          result.push(groups[key])
        resolve(result);
      });
    }
  })
}

function applyColorToGroups(gateWay, apiKey, groups, avgColor) {
  return new Promise((resolve, reject) => {
    for (let item of groups) {
      try {
        const hsb = rgbToHsv(avgColor.r, avgColor.g, avgColor.b)
        var options = {
          uri: `http://${gateWay.internalipaddress}:${gateWay.internalport}/api/${apiKey}/groups/${item.id}/action`,
          method: 'PUT ',
          json: {
            "on": true,
            "hue": hsb[0],
            "sat":  hsb[1],
            "bri":  hsb[2],
            "transitiontime": 10
          }
        };

        
        console.log("applyColorToGroups", JSON.stringify(options.json))
  
        request.put(options, (error, response, body) => {
          if (error)
            return reject(error)
          if (response.statusCode != 200)
            return reject('Invalid status code <' + response.statusCode + '>')
  
          resolve(body[0].response);
        })
      } catch (error) {
        reject('Could not parse gateWay data <' + error + '>');
      }
    }
  });
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ Math.floor(65535*h), Math.floor(255*s), Math.floor(255*l) ];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ r * 255, g * 255, b * 255 ];
}

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ Math.floor(65535*h), Math.floor(255*s), Math.floor(255*v) ];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r * 255, g * 255, b * 255 ];
}

function performPulseEffect(allLeds, x) {
  const cnt = allLeds.length
  let val = ~~((1 - (x - 1) * (x - 1)) * 255)
  for (let di = 0; di < cnt; ++di) {
    const device_leds = allLeds[di]
    device_leds.forEach(led => {
      led.r = 0
      led.g = val
      led.b = 0
    })

    sdk.CorsairSetLedsColorsBufferByDeviceIndex(di, device_leds)
  }
  sdk.CorsairSetLedsColorsFlushBuffer()
}

async function main() {
  const details = sdk.CorsairPerformProtocolHandshake()
  const errCode = sdk.CorsairGetLastError()
  if (errCode !== 0) {
    console.error(`Handshake failed: ${sdk.CorsairErrorString[errCode]}`)
    exit(1)
  }

  const availableLeds = getAvailableLeds()
  if (!availableLeds.length) {
    console.error('No devices found')
    exit(1)
  }

  const avgColor = getAverageColor(availableLeds)
  if (!avgColor) {
    console.error("no avgColor found")
    exit(1)
  }

  //see https://dresden-elektronik.github.io/deconz-rest-doc/getting_started/
  const url = "https://phoscon.de"
  const gateWay = await discoverGateWay(url)
  if (!gateWay) {
    console.error("gateway not found")
    exit(1)
  }

  let apiKey = await getApiKey(gateWay)
  if (!apiKey || apiKey.length > 10) {
    console.error("apiKey not found")
    apiKey = "D25BD34CEE"
    //exit(1)
  }

  const lights = await getLights(gateWay, apiKey)
  if (!lights) {
    console.error("no lights found")
    exit(1)
  }

  const groups = await getGroups(gateWay, apiKey)
  if (!groups) {
    console.error("no groups found")
    exit(1)
  }

  //applyColorToGroups(gateWay, apiKey, groups, avgColor)

  console.log(
    'Working... Use "+" or "-" to increase or decrease speed.\n' +
    'Press "q" to close program...'
  )

  function loop(gateWay, apiKey, groups) {
    const TIME_PER_FRAME = 500
    if (input_queue.length > 0) {
      const input = input_queue.shift()
      if (input === 'q' || input === 'Q') {
        exit(0)
      }
    }

    applyColorToGroups(gateWay, apiKey, groups, getAverageColor(
      getAvailableLeds()
    ))

    /*
    performPulseEffect(leds, x)
  */
    return setTimeout(
      loop,
      TIME_PER_FRAME,
      gateWay, apiKey, groups
    )
  }


  return loop(gateWay, apiKey, groups)
}

main()