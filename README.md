# PolyVolcaWeb

PolyVolcaWeb is a web application that transforms a KORG volca sample2 into a stereo polyphonic sample-based synth. Available at https://polyvolca.rafaelpernil.com

[![](https://feranern.sirv.com/Images/volcasamplepolyvolca.png)](https://polyvolca.rafaelpernil.com)

## Table of Contents

- [PolyVolcaWeb](#polyvolcaweb)
  - [Table of Contents](#table-of-contents)
  - [Why?](#why)
  - [Features](#features)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [Support](#support)
  - [Credits](#credits)
  - [License](#license)

## Why?

A few months ago I was looking for a drum machine and I ended up choosing a volca sample for its versatility. Since I wanted a new unit, it had to be the new revision, the first version is already discontinued. There's upsides and downsides to each version, the first version had a custom firmware which turned this device into something else, with plenty of possibilities including chromatic pitch with a MIDI controller.

Well, looking at the MIDI implementation of this new revision, I saw that there is a MIDI CC for Chromatic Speed (a.k.a. Chromatic Pitch), CC#49. I tried to map MIDI Note On messages to this parameter translating the pitch, it seemed pretty straight forward. 

To be honest, I did not know anything about MIDI software development or any kind of realtime code apart from some messing around with Max4Live. This was an opportunity to learn and make something useful in this domain. Next on my list is creating oscillators/effects with LogueSDK :D

My first plan was using Max4Live for this project for a seamless integration with an Ableton Live workflow. Well, I managed to make it work, but due to Ableton Live architecture, it is very complicated to develop a plugin that outputs to several MIDI channels since one instance of a plugin can only output to one MIDI device and channel.

Apart from that, volca users prefer DAWless solutions, if we wanted to use a computer we would use MIDI controllers and not musical instruments, am I right?

Here's how Max code looks, it's a graphical programming language, not as flexible as I would like:
[![](https://feranern.sirv.com/Images/volcasamplemax.png)](https://maxforlive.com/library/device/7909/volca-sample2-polyphonic-chromatic-player)

My next plan was looking for a way to develop a minimum requirement MIDI software, no hardware required and very little software needed. Arduino is cool and its code is pretty straightforward but you need the board, solder a MIDI connector... And why should you need to do that when volca sample2 has a USB connection? The best option was Web MIDI API, you open the web and it works, in any device, as simple as that.

The first iteration of this project, mimicking the exact same functionality as my Max4Live plugin took me only an afternoon to develop and host, compared to about two weeks of painful trial and error with Max4Live.

After releasing the first version, I have developed many big improvements that I could not have done with Max4Live. I'm sure you will have fun with this app and find many musical uses :)


## Features

* 8-voice polyphonic chromatic playing with any MIDI keyboard - Uses Chromatic Pitch (CC#49)
* Efficient code - No frameworks, no dependencies. Uses bitwise operations, minification and zero DOM operation on MIDI input events
* Automatic setup - Selects volca sample2 if found by default
* MIDI Input device and channel selector with "Any" mode available
* UI Global sample selector - Sets the selected sample in all volca channels
* Global sample tweaking - Populates any sample modification to all volca channels
* Channel allocation algorithms for polyphony - Round Robin and Active Note Count
* Octave offsets - Compensates base octave of sample
* Velocity sensitivity - Maps Note On velocity to Level (CC#7)
* Stereo spread - Pans lower notes to the left and higher notes to the right
* Reverb - Enables reverb for all channels
* Note-Off and Sustain Pedal support
* Multi-Layered Sampling Mode - Select a particular sample for a particular velocity range. Great for adding realism

## Usage

1. Plug in your volca sample2 and a MIDI keyboard to your device
2. Open https://polyvolca.rafaelpernil.com
3. Select your MIDI keyboard and channel as input
4. Select your volca sample2 as Output device and Loopback device
5. Pick a sample
6. ???
7. Profit!

I will make a video showing musical examples, stay tuned! :)

## Contributing
Let me know if you find any bug or if you have an idea to improve this project :)

## Support
If you like my work and want to support me, this is a great place to show your love. Thanks!

* [Paypal](https://www.paypal.com/donate/?hosted_button_id=9RRAEE5J7NNNN)

## Credits
This web application has been developed by:

**Rafael Pernil Bronchalo** - *Software Engineer*

* [github/rafaelpernil2](https://github.com/rafaelpernil2)

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
