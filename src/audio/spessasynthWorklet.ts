export const SPESSASYNTH_WORKLET_URL =
  `${import.meta.env.BASE_URL}vendor/spessasynth_processor.min.js`

export const registerSpessaSynthWorklet = async (context: BaseAudioContext) => {
  if (!context.audioWorklet) {
    throw new Error('This browser does not provide AudioWorklet support.')
  }
  await context.audioWorklet.addModule(SPESSASYNTH_WORKLET_URL)
}
