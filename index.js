let midiInputSelected = null;
let midiOutputSelected = null;
let midiLoopbackInputSelected = null;
let inputMidiChannel = null;
let outputMidiChannel = 0;
let algorithmSelected = null;
let octaveOffset = null;
let velocityToggle = null;
let stereoSpreadToggle = null;
let reverbToggle = null;
let isSustainOn = false;
let noteOffToggle = true;
let noteOnList = new Array(8);
let sustainedNoteList = new Array(8);
let sampleNumber = { MSB: 0, LSB: 0 };
let LSBMessageCount = 0;
const VOLCA_SAMPLE_NAME_MATCH = "sample";
const CC_MSG = "b";
const NOTE_ON_MSG = "9";
const NOTE_OFF_MSG = "8";
const ROUND_ROBIN = "Round Robin";
const NOTE_COUNT = "Active note count";
const ANY_DEVICE = "--- Any device ---";
const RECOMMENDED = " (Recommended)";
const ANY_DEVICE_VALUE = "anyDevice";
const ANY_CHANNEL = "Any";
const ANY_CHANNEL_VALUE = "x";
const DEFAULT_OCTAVE = "Default";
const DEFAULT_OCTAVE_VALUE = 4;
const OCTAVE_BELOW = "Octave below";
const OCTAVE_BELOW_VALUE = -8;
const OCTAVE_ABOVE = "Octave above";
const OCTAVE_ABOVE_VALUE = 16;
const VELOCITY_TOGGLE_OFF = "Max. velocity fixed";
const VELOCITY_TOGGLE_OFF_VALUE = false;
const VELOCITY_TOGGLE_ON = "Velocity sensitive";
const VELOCITY_TOGGLE_ON_VALUE = true;
const STEREO_SPREAD_TOGGLE_OFF = "Mono";
const STEREO_SPREAD_TOGGLE_OFF_VALUE = false;
const STEREO_SPREAD_TOGGLE_ON = "Stereo";
const STEREO_SPREAD_TOGGLE_ON_VALUE = true;
const REVERB_TOGGLE_OFF = "Off";
const REVERB_TOGGLE_OFF_VALUE = false;
const REVERB_TOGGLE_ON = "On";
const REVERB_TOGGLE_ON_VALUE = true;
const NOTE_OFF_TOGGLE_OFF = "Off";
const NOTE_OFF_TOGGLE_OFF_VALUE = false;
const NOTE_OFF_TOGGLE_ON = "On";
const NOTE_OFF_TOGGLE_ON_VALUE = true;

// SOUND DESIGN PARAMETERS AVAILABLE
// Sample No. MSB, Sample No. LSB, Sample Start Point, Length, Hi Cut,
// Pitch EG Intensity, Atack, Decay, Amp EG Attack, Decay, Loop On/Off, Reverse On/Off
const SOUND_DESIGN_CC_LIST = [3, 35, 40, 41, 42, 44, 45, 46, 47, 48, 68, 75];

function onMIDISuccess() {
  console.log("MIDI ready!");
}

function onMIDIFailure(msg) {
  console.log("Failed to get MIDI access - " + msg);
  alert(
    "Ooops! Your browser does not support WebMIDI. \nPlease use Google Chrome or a Chromium based browser (like Edge)."
  );
  window.location.href = "about:blank";
}

/**
 * SETUP FUNTIONS
 */
function setInputSelector(midiAccess) {
  const selector = document.getElementById("InputSelector");
  // Event listener
  selector.addEventListener("change", function () {
    if (midiInputSelected === ANY_DEVICE_VALUE) {
      for (const [, device] of midiAccess.inputs) {
        device.onmidimessage = null;
      }
    } else {
      const previousValue = midiAccess.inputs.get(midiInputSelected);
      if (previousValue != null) {
        previousValue.onmidimessage = null;
      }
    }
    midiInputSelected = this.value;
    forwardMIDIEvents(midiAccess);
  });
  // Options
  addOptions(selector, ANY_DEVICE, ANY_DEVICE_VALUE);
  for (const [id, midiInput] of midiAccess.inputs) {
    addOptions(selector, midiInput.name, id);
  }
}

function setInputChannelSelector() {
  const channelSelector = document.getElementById("InputChannelSelector");
  // Event listener
  channelSelector.addEventListener("change", function () {
    inputMidiChannel = this.value;
  });
  // Options
  addOptions(channelSelector, ANY_CHANNEL, ANY_CHANNEL_VALUE);
  for (let index = 0; index < 16; index++) {
    addOptions(channelSelector, String(index + 1), index.toString(16));
  }
}

function setOutputSelector(midiAccess) {
  const selector = document.getElementById("OutputSelector");
  selector.addEventListener("change", function () {
    midiOutputSelected = this.value;
    reverbActivator(midiAccess);
  });
  let init = true;
  for (const [id, midiOutput] of midiAccess.outputs) {
    addOptions(selector, midiOutput.name, id, { init });
    init = false;
    if (midiOutput.name.includes(VOLCA_SAMPLE_NAME_MATCH)) {
      selector.value = id;
      midiOutputSelected = id;
    }
  }
}

function setLoopbackInputSelector(midiAccess) {
  const selector = document.getElementById("LoopbackInputSelector");
  selector.addEventListener("change", function () {
    midiLoopbackInputSelected = this.value;
    forwardLoopbackMIDIEvents(midiAccess);
  });
  let init = true;
  for (const [id, midiInput] of midiAccess.inputs) {
    addOptions(selector, midiInput.name, id, { init });
    init = false;
    if (midiInput.name.includes(VOLCA_SAMPLE_NAME_MATCH)) {
      selector.value = id;
      midiLoopbackInputSelected = id;
      forwardLoopbackMIDIEvents(midiAccess);
    }
  }
}

function setSampleSelector(midiAccess) {
  const sampleSelector = document.getElementById("SampleSelector");
  const onSampleChange = (event) =>
    sampleSelect(midiAccess, event.target.valueAsNumber);
  sampleSelector.addEventListener("keyup", onSampleChange);
  sampleSelector.addEventListener("change", onSampleChange);
}

function setAlgorithmSelector() {
  const selector = document.getElementById("AlgorithmSelector");
  selector.addEventListener("change", function () {
    outputMidiChannel = 0;
    algorithmSelected = this.value;
  });
  addOptions(selector, ROUND_ROBIN + RECOMMENDED, ROUND_ROBIN);
  addOptions(selector, NOTE_COUNT, NOTE_COUNT);
  selector.value = ROUND_ROBIN;
  algorithmSelected = ROUND_ROBIN;
}

function setOctaveSelector() {
  const selector = document.getElementById("OctaveSelector");
  selector.addEventListener("change", function () {
    octaveOffset = Number(this.value);
  });
  addOptions(selector, OCTAVE_BELOW, OCTAVE_BELOW_VALUE);
  addOptions(selector, DEFAULT_OCTAVE + RECOMMENDED, DEFAULT_OCTAVE_VALUE);
  addOptions(selector, OCTAVE_ABOVE, OCTAVE_ABOVE_VALUE);
  selector.value = DEFAULT_OCTAVE_VALUE;
  octaveOffset = DEFAULT_OCTAVE_VALUE;
}

function setVelocityToggleSelector() {
  const selector = document.getElementById("VelocityToggleSelector");
  selector.addEventListener("change", function () {
    velocityToggle = this.value === "true";
  });
  addOptions(
    selector,
    VELOCITY_TOGGLE_ON + RECOMMENDED,
    VELOCITY_TOGGLE_ON_VALUE
  );
  addOptions(selector, VELOCITY_TOGGLE_OFF, VELOCITY_TOGGLE_OFF_VALUE);
  selector.value = VELOCITY_TOGGLE_ON_VALUE;
  velocityToggle = VELOCITY_TOGGLE_ON_VALUE;
}

function setStereoSpreadToggleSelector() {
  const selector = document.getElementById("StereoSpreadToggleSelector");
  selector.addEventListener("change", function () {
    stereoSpreadToggle = this.value === "true";
  });
  addOptions(
    selector,
    STEREO_SPREAD_TOGGLE_ON + RECOMMENDED,
    STEREO_SPREAD_TOGGLE_ON_VALUE
  );
  addOptions(
    selector,
    STEREO_SPREAD_TOGGLE_OFF,
    STEREO_SPREAD_TOGGLE_OFF_VALUE
  );
  selector.value = STEREO_SPREAD_TOGGLE_ON_VALUE;
  stereoSpreadToggle = STEREO_SPREAD_TOGGLE_ON_VALUE;
}

function setReverbSelector(midiAccess) {
  const selector = document.getElementById("ReverbToggleSelector");
  selector.addEventListener("change", function () {
    reverbToggle = this.value === "true";
    reverbActivator(midiAccess);
  });
  addOptions(selector, REVERB_TOGGLE_ON + RECOMMENDED, REVERB_TOGGLE_ON_VALUE);
  addOptions(selector, REVERB_TOGGLE_OFF, REVERB_TOGGLE_OFF_VALUE);
  selector.value = REVERB_TOGGLE_ON_VALUE;
  reverbToggle = REVERB_TOGGLE_ON_VALUE;
  reverbActivator(midiAccess);
}

function setNoteOffToggleSelector() {
  const selector = document.getElementById("NoteOffToggleSelector");
  selector.addEventListener("change", function () {
    noteOffToggle = this.value === "true";
    isSustainOn = !noteOffToggle;
  });
  addOptions(
    selector,
    NOTE_OFF_TOGGLE_ON + RECOMMENDED,
    NOTE_OFF_TOGGLE_ON_VALUE
  );
  addOptions(selector, NOTE_OFF_TOGGLE_OFF, NOTE_OFF_TOGGLE_OFF_VALUE);
  selector.value = NOTE_OFF_TOGGLE_ON_VALUE;
  noteOffToggle = NOTE_OFF_TOGGLE_ON_VALUE;
  isSustainOn = !noteOffToggle;
}

/**
 * MIDI HANDLERS
 */
function onMIDIMessage(midiAccess, { isLoopback = false } = {}) {
  return (event) => {
    const hexArray = [...event.data].map((chunk) => chunk.toString(16));
    const { header, channel, noteCC, velocityValue } = {
      header: hexArray[0][0],
      channel: hexArray[0][1],
      noteCC: hexArray?.[1] ?? "",
      velocityValue: hexArray?.[2] ?? "",
    };
    if (isLoopback) {
      header === CC_MSG &&
        populateSoundDesign(midiAccess, channel, noteCC, velocityValue);
      return;
    }
    if (inputMidiChannel !== ANY_CHANNEL_VALUE && channel !== inputMidiChannel)
      return;

    switch (header) {
      case NOTE_ON_MSG:
        convertNoteToVolcaPitch(midiAccess, noteCC, velocityValue);
        break;
      case NOTE_OFF_MSG:
        noteOffStopSound(midiAccess, noteCC);
        noteOffChannelDecrease();
        break;
      case CC_MSG:
        checkSustainPedal(midiAccess, noteCC, velocityValue);
        break;
      default:
        break;
    }
  };
}

function forwardMIDIEvents(midiAccess) {
  if (midiInputSelected == null) return;

  if (midiInputSelected === ANY_DEVICE_VALUE) {
    for (const [, device] of midiAccess.inputs) {
      device.onmidimessage = onMIDIMessage(midiAccess);
    }
  } else {
    const midiInput = midiAccess.inputs.get(midiInputSelected);
    if (midiInput == null) return;

    midiInput.onmidimessage = onMIDIMessage(midiAccess);
  }
}

function forwardLoopbackMIDIEvents(midiAccess) {
  const midiInput = midiAccess.inputs.get(midiLoopbackInputSelected);
  if (midiInput == null) return;

  midiInput.onmidimessage = onMIDIMessage(midiAccess, { isLoopback: true });
}

/** Custom functions for Volca Sample2 */

function convertNoteToVolcaPitch(midiAccess, note, velocity) {
  const parsedNote = parseInt(note, 16);
  // Prepare messages, first CC and then note
  const channel = outputMidiChannel.toString(16);
  // Round robin algorithm
  if (algorithmSelected === ROUND_ROBIN) {
    // There is an array of channels per note because due to RoundRobin and timing issues, there could be a pitch repeated through different channels
    // This removes random notes that should stop but don't
    // Note count algorithm does not work with note-off message
    noteOnList[outputMidiChannel] = parsedNote;
    sustainedNoteList[outputMidiChannel] = null;
    outputMidiChannel = outputMidiChannel === 7 ? 0 : outputMidiChannel + 1;
  }
  // Active note count algorithm
  else {
    outputMidiChannel = outputMidiChannel === 7 ? 7 : outputMidiChannel + 1;
  }

  const ccMsg = parseInt(`${CC_MSG}${channel}`, 16);

  // Send converted note over CC#49
  const moddedNote = parsedNote + octaveOffset;
  const pitchMessage = [ccMsg, 49, moddedNote];

  // Send converted level over CC#7
  const moddedVelocity = velocityToggle ? parseInt(velocity, 16) : 127;
  const velocityMessage = [ccMsg, 7, moddedVelocity];

  // Send converted pan over CC#10
  // 1.375 is 88/64 to convert 88 notes to a 64 value range
  // -21 is used to start at note 0 and end at 88
  // Then we add 32 to adhere to range
  // 64 is the default value
  const moddedPan = stereoSpreadToggle
    ? Math.floor((parsedNote - 21) / 1.375) + 32
    : 64;
  const panMessage = [ccMsg, 10, moddedPan];

  // Generic note message to trigger the output
  const noteMessage = [parseInt(`${NOTE_ON_MSG}${channel}`, 16), 60, 127];

  const output = midiAccess.outputs.get(midiOutputSelected);
  // Set CC values
  output.send(pitchMessage, window.performance.now());
  output.send(velocityMessage, window.performance.now());
  output.send(panMessage, window.performance.now());
  // Trigger note
  output.send(noteMessage, window.performance.now());
}

function sampleSelect(midiAccess, sampleNumber) {
  const [MSB, LSB] = [Math.floor(sampleNumber / 100), sampleNumber % 100];
  const output = midiAccess.outputs.get(midiOutputSelected);
  for (let channel = 0; channel < 8; channel++) {
    const hexChannel = channel.toString(16);
    // MSB goes to CC#3
    const MSBMessage = [parseInt(`${CC_MSG}${hexChannel}`, 16), 3, MSB];
    // LSB goes to CC#35
    const LSBMessage = [parseInt(`${CC_MSG}${hexChannel}`, 16), 35, LSB];
    output.send(MSBMessage, window.performance.now());
    output.send(LSBMessage, window.performance.now());
  }
}

function getSampleNumberFromMIDI() {
  const { MSB, LSB } = sampleNumber;
  return MSB * 100 + LSB;
}

function updateSampleInput() {
  const sampleSelector = document.getElementById("SampleSelector");
  sampleSelector.value = getSampleNumberFromMIDI();
  // Reset octave offset
  const selector = document.getElementById("OctaveSelector");
  selector.value = DEFAULT_OCTAVE_VALUE;
  octaveOffset = DEFAULT_OCTAVE_VALUE;
}

function reverbActivator(midiAccess) {
  const output = midiAccess.outputs.get(midiOutputSelected);
  const value = reverbToggle ? 127 : 0;
  for (let channel = 0; channel < 8; channel++) {
    const hexChannel = channel.toString(16);
    // Activate reverb on CC#70
    const activateReverb = [parseInt(`${CC_MSG}${hexChannel}`, 16), 70, value];
    output.send(activateReverb, window.performance.now());
  }
}

/** UTILS */

function addOptions(selector, text, value, { init = true } = {}) {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  selector.appendChild(option);
  if (init) selector.value = null;
}

function noteOffStopSound(midiAccess, note) {
  if (algorithmSelected !== ROUND_ROBIN) return;

  const parsedNote = parseInt(note, 16);
  const output = midiAccess.outputs.get(midiOutputSelected);

  for (let channel = 0; channel < noteOnList.length; channel++) {
    const note = noteOnList[channel];
    if (note !== parsedNote) continue;
    if (isSustainOn) {
      // Concatenates previous sustained notes channels with current note off that must wait until sustain pedal is released
      sustainedNoteList[channel] = parsedNote;
      continue;
    }

    // Stop all active notes now since sustain is off
    // Decrease level to 0
    const hexChannel = channel.toString(16);
    const levelMessage = [parseInt(`${CC_MSG}${hexChannel}`, 16), 7, 0];

    // Set CC values
    output.send(levelMessage, window.performance.now());
    noteOnList[channel] = null;
  }
}

function noteOffChannelDecrease() {
  if (algorithmSelected !== NOTE_COUNT) return;
  outputMidiChannel = outputMidiChannel <= 0 ? 0 : outputMidiChannel - 1;
}

function checkSustainPedal(midiAccess, cc, value) {
  const [parsedCC, parsedValue] = [parseInt(cc, 16), parseInt(value, 16)];
  if (parsedCC !== 64 || !noteOffToggle) return;

  isSustainOn = parsedValue === 127;

  if (isSustainOn || algorithmSelected === NOTE_COUNT) return;

  // Silence all sustained notes
  const output = midiAccess.outputs.get(midiOutputSelected);
  for (let channel = 0; channel < sustainedNoteList.length; channel++) {
    const note = sustainedNoteList[channel];
    if (note == null) continue;
    const parsedChannel = channel.toString(16);
    const levelMessage = [parseInt(`${CC_MSG}${parsedChannel}`, 16), 7, 0];
    // Set CC values
    output.send(levelMessage, window.performance.now());
    sustainedNoteList[channel] = null;
  }
}

function populateSoundDesign(midiAccess, currentChannel, cc, value) {
  const [parsedChannel, parsedCC, parsedValue] = [
    parseInt(currentChannel, 16),
    parseInt(cc, 16),
    parseInt(value, 16),
  ];
  if (!SOUND_DESIGN_CC_LIST.includes(parsedCC)) {
    return;
  }

  // Get sample number from MIDI CC
  // MSB
  if (parsedCC === 3) {
    LSBMessageCount = 0;
    sampleNumber.MSB = parsedValue;
    updateSampleInput();
  }
  // LSB
  if (parsedCC === 35) {
    // if no MSB is sent, it is 0
    if (LSBMessageCount === 1) {
      sampleNumber.MSB = 0;
      LSBMessageCount = 0;
    }
    sampleNumber.LSB = parsedValue;
    LSBMessageCount++;
    updateSampleInput();
  }

  // Populate sample sound design to all channels
  const output = midiAccess.outputs.get(midiOutputSelected);
  for (let channel = 0; channel < 8; channel++) {
    // Avoid MIDI event loops
    if (channel === parsedChannel) {
      continue;
    }
    const hexChannel = channel.toString(16);
    const ccMessage = [
      parseInt(`${CC_MSG}${hexChannel}`, 16),
      parsedCC,
      parsedValue,
    ];
    output.send(ccMessage, window.performance.now());
  }
}

/** MAIN */
(async () => {
  let midiAccess = null;
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch (error) {
    onMIDIFailure();
  }
  onMIDISuccess(midiAccess);
  setInputSelector(midiAccess);
  setInputChannelSelector();
  setOutputSelector(midiAccess);
  setLoopbackInputSelector(midiAccess);
  setSampleSelector(midiAccess);
  setAlgorithmSelector();
  setOctaveSelector();
  setVelocityToggleSelector();
  setStereoSpreadToggleSelector();
  setNoteOffToggleSelector();
  setReverbSelector(midiAccess);
  forwardMIDIEvents(midiAccess);
})();
