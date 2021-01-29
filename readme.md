# deCue

Interfaces deConz REST-API (<https://dresden-elektronik.github.io/>) and Corsair cue node SDK (<https://github.com/CorsairOfficial/cue-sdk-node>) to sync colors.

## Features

    - querry available corsair devices and leds
    - calculate average rgb color over leds
    - discover gateway,get api key and querry light groups
    - convert rgb to hsv and sync to light groups

Tested with Phillips Hue lights and several Corsair devices.

## Instructions

In order to get the API key of your gateway you'll need to [unlock your gateway](https://dresden-elektronik.github.io/deconz-rest-doc/getting_started/#unlock-the-gateway) first.
While the gateway is unlocked, start index.js. If everything works, the gateway will sync all available light groups with the average color across your corsair devices.

## TODO

    - single and group selections for both corsair devices and gateway items
    - linking between items and groups
    - UI
    - better looping and update handling (drop update request if colors didn't change)