# deCue

Interfaces deConz REST-API (<https://dresden-elektronik.github.io/>) and Corsair cue Node SDK (<https://github.com/CorsairOfficial/cue-sdk-node>) to sync colors.

## Features

    - get available corsair devices
    - calculate average rgb color
    - discover gateway,get api key and querry light groups
    - convert rgb to hsv and sync to light groups

Tested with Phillips Hue lights and several corsair devices.

## TODO

    - single and group selections for both corsair devices and gateway items
    - linking between items and groups
    - UI
    - better looping and update handling (drop update request if colors didn't change)