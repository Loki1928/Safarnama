// Safarnama configuration. These values are safe to be public:
// security comes from firestore.rules, not from hiding these keys.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Cloudinary photo hosting. Needs an UNSIGNED upload preset (SETUP.md step 6).
export const cloudinaryConfig = {
  cloudName: "",
  uploadPreset: ""
};

// App identity. Change the name here when the final brand is chosen.
export const APP = {
  name: "Safarnama",
  tagline: "Real trips. Real rupees.",
  contactEmail: ""
};
