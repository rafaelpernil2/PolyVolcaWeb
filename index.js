let midiInputSelected = null;
let midiOutputSelected = null;
let midiInputChannelSelected = null;
let outputMidiChannel = 0;
let algorithmSelected = null;
const CC_MSG = "b";
const NOTE_ON_MSG = "9";
const NOTE_OFF_MSG = "8";
const ROUND_ROBIN = "Round Robin";
const NOTE_COUNT = "Active note count";
const ANY_DEVICE = "--- Any device ---";
const ANY_CHANNEL = "Any";

function onMIDISuccess() {
  console.log("MIDI ready!");
}

function onMIDIFailure(msg) {
  console.log("Failed to get MIDI access - " + msg);
  alert("Ooops! Your browser does not support WebMIDI. \nPlease use Google Chrome or a Chromium based browser (like Edge).");
  window.location.href="about:blank";
}

/**
 * SETUP FUNTIONS
 */
function setInputSelector(midiAccess) {
  const selector = document.getElementById("InputSelector");
  // Event listener
  selector.addEventListener("change", function () {
    if (midiInputSelected === ANY_DEVICE) {
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
  addOptions(selector, ANY_DEVICE, ANY_DEVICE);
  for (const [id, midiInput] of midiAccess.inputs) {
    addOptions(selector, midiInput.name, id);
  }
  // Initial value
  selector.value = null;
}

function setInputChannelSelector() {
  const channelSelector = document.getElementById("InputChannelSelector");
  // Event listener
  channelSelector.addEventListener("change", function () {
    midiInputChannelSelected = this.value;
  });
  // Options
  addOptions(channelSelector, ANY_CHANNEL, ANY_CHANNEL);
  for (let index = 0; index < 16; index++) {
    addOptions(channelSelector, String(index + 1), index.toString(16));
  }
  // Initial value
  channelSelector.value = null;
}

function setOutputSelector(midiAccess) {
  const selector = document.getElementById("OutputSelector");
  selector.addEventListener("change", function () {
    midiOutputSelected = this.value;
  });
  for (const [id, midiOutput] of midiAccess.outputs) {
    addOptions(selector, midiOutput.name, id);
    // Intelligent auto initialization
    selector.value = null;
    if (midiOutput.name.includes("sample")) {
      selector.value = id;
      midiOutputSelected = id;
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
  addOptions(selector, ROUND_ROBIN + " (Recommended)", ROUND_ROBIN);
  addOptions(selector, NOTE_COUNT, NOTE_COUNT);
  selector.value = ROUND_ROBIN;
  algorithmSelected = ROUND_ROBIN;
}

/**
 * MIDI HANDLERS
 */

function onMIDIMessage(midiAccess) {
  return (event) => {
    const hexArray = [...event.data].map((chunk) => chunk.toString(16));
    const { header, channel, noteCC, velocityValue } = {
      header: hexArray[0][0],
      channel: hexArray[0][1],
      noteCC: hexArray?.[1] ?? "",
      velocityValue: hexArray?.[2] ?? "",
    };
    if (String(midiInputChannelSelected) !== ANY_CHANNEL && channel !== midiInputChannelSelected) {
      return;
    }
    midiAccess
    switch (header) {
      case NOTE_ON_MSG:
        convertNoteToVolcaPitch(midiAccess, noteCC, velocityValue);
        break;
      case NOTE_OFF_MSG:
        noteOffChannelDecrease();
        break;
      default:
        break;
    }
  };
}

function forwardMIDIEvents(midiAccess) {
  if (midiInputSelected == null) {
    return;
  }
  if (midiInputSelected === ANY_DEVICE) {
    for (const [, device] of midiAccess.inputs) {
      device.onmidimessage = onMIDIMessage(midiAccess);
    }
  } else {
    const midiInput = midiAccess.inputs.get(midiInputSelected);
    if (midiInput == null) {
      return;
    }
    midiInput.onmidimessage = onMIDIMessage(midiAccess);
  }
}

/** Custom functions for Volca Sample2 */

function convertNoteToVolcaPitch(midiAccess, note) {
  // Prepare messages, first CC and then note
  const moddedNote = parseInt(note, 16) + 4;
  const hexOutputChannel = outputMidiChannel.toString(16);

  // Send converted note over CC#49
  const ccMessage = [
    parseInt(`${CC_MSG}${hexOutputChannel}`, 16),
    49,
    moddedNote,
  ];

  // Generic note message to trigger the output
  const noteMessage = [
    parseInt(`${NOTE_ON_MSG}${hexOutputChannel}`, 16),
    0x64,
    0x7f,
  ];

  const output = midiAccess.outputs.get(midiOutputSelected);
  output.send(ccMessage);
  output.send(noteMessage);

  // Round robin algorithm
  if (algorithmSelected === ROUND_ROBIN) {
    outputMidiChannel = outputMidiChannel === 7 ? 0 : outputMidiChannel + 1;
  }
  // Active note count algorithm
  else {
    outputMidiChannel = outputMidiChannel === 7 ? 7 : outputMidiChannel + 1;
  }
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
    output.send(MSBMessage);
    output.send(LSBMessage);
  }
}

/** UTILS */

function addOptions(selector, text, value) {
  const option = document.createElement("option");
  option.text = text;
  option.value = value;
  selector.appendChild(option);
}

function noteOffChannelDecrease() {
  if (algorithmSelected !== NOTE_COUNT) {
    return;
  }
  outputMidiChannel = outputMidiChannel <= 0 ? 0 : outputMidiChannel - 1;
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
  setSampleSelector(midiAccess);
  setAlgorithmSelector();
  forwardMIDIEvents(midiAccess);
})();
