export const WEAVE_WRITING = {
  identity: {
    institution: 'The Weave of Presence',
    subject: 'System Switch — Bridge Radiance',
    movement: 'Interaction in Motion',
  },

  grammar: {
    place: 'Place',
    movement: 'Movement',
    state: 'State',
    action: 'Action',
    continuation: 'Continuation',
  },

  bridgeRadiance: {
    event: 'Flame Event · Burning River',
    eventName: 'The River that Burns',
    place: 'Bridge Radiance',
    position: 'Prospect Crossing',
    movement: 'Prospect movement toward Client formation.',
    topic: 'Current Topic',
    fileNumber: 'File Number',
    fileNumberPending: 'Not yet issued',
    arrival: 'Movement received',
    movementCount: 'Bridge movement',
    title: 'Your movement has reached the Bridge.',
    body:
      'Bridge Radiance carries the Prospect movement toward a Client position. Move through the company functions, form the File Folder, and continue when Administration issues the File Number.',
    action: 'Continue to File Folder',
  },

  fileFolderCrossing: {
    place: 'File Folder Crossing',
    title: 'Establish the File Folder.',
    body:
      'The File Folder is the Client’s persistent operating environment. Record the TRX movement here. Administration verifies it and issues the File Number. Registration then establishes the Client position and opens System Switch.',
    stages: [
      'Recognition',
      'File Folder Value',
      'TRX Movement',
      'Administration',
      'Client Crossing',
    ],
    state: 'Crossing State',
    recognition: 'Prospect Recognition',
    value: 'File Folder Value',
    trx: 'TRX Movement',
    administration: 'Administration → Client',
    recordAction: 'Record Payment Movement',
    pendingTitle: 'Awaiting Administration verification.',
    pendingBody:
      'The payment movement is recorded. When Administration verifies it, WEAVE issues the File Number here. No second purchase is required.',
    confirmedTitle: 'File Number issued',
    confirmedBody:
      'The File Number is issued. Establish the Client identity with this number; System Switch opens from that Client position.',
    rejectedTitle: 'Verification not completed.',
    rejectedBody:
      'Administration did not verify this TRX movement. Confirm the transaction details before recording another File Folder movement.',
    crossAction: 'Establish Client Position',
  },

  clientAccess: {
    registrationPlace: 'Client Crossing',
    registrationTitle: 'Establish Client Identity',
    fileRecognition: 'File Number Recognition',
    detailsTitle: 'Complete Client Identity',
    recognitionBody: 'Enter the File Number issued by Administration.',
    detailsBody: 'Set the Client access details attached to this File Folder.',
    recognizeAction: 'Recognize File Number',
    recognized: 'File Number Recognized',
    completeAction: 'Establish Client Position',
    existing: 'Already established?',
    enter: 'Enter Client World',

    loginPlace: 'Client Position',
    loginTitle: 'Client Access',
    loginBody: 'Enter the File Number and password attached to your Client position.',
    fileNumber: 'File Number',
    password: 'Password',
    loginAction: 'Enter Client World',
    registrationAction: 'Establish Client Identity',
  },

  positionAccess: {
    access: 'WEAVE · Position Access',
    administrationAccess: 'WEAVE · Administration Access',
    divider: 'Interaction in Motion',
    clientAccess: 'Client Access',
    chooseTitle: 'Choose Your Position',
    chooseBody: 'Choose the position you are entering.',
    existing: 'Already have a position?',
    signIn: 'Sign In',
    termsTitle: 'Terms of Participation',
    termsBody: 'Review the company terms before continuing.',
    acceptTerms: 'Accept Terms and Continue',
    guidanceTitle: 'Position Guidance',
    guidanceBody: 'How this position moves inside WEAVE.',
    identityTitle: 'Establish Position',
  },
} as const
