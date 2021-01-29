# deCue

Interfaces deConz REST-API (<https://dresden-elektronik.github.io/>) and Corsair cue node SDK (<https://github.com/CorsairOfficial/cue-sdk-node>) to sync colors.

## Features

    - querry available corsair devices and leds
    - calculate average rgb color over leds
    - discover gateway,get api key and querry light groups
    - convert rgb to hsv and sync to light groups

Tested with Phillips Hue lights and several Corsair devices.

## TODO

    - single and group selections for both corsair devices and gateway items
    - linking between items and groups
    - UI
    - better looping and update handling (drop update request if colors didn't change)