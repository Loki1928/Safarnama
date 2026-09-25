// Safarnama configuration. These values are safe to be public:
// security comes from firestore.rules, not from hiding these keys.
export const firebaseConfig = {
    apiKey: "AIzaSyCrOszniNuO6f3QK6mIsQPESoMSVdULgs8",
    authDomain: "safarnama-1928.firebaseapp.com",
    projectId: "safarnama-1928",
    storageBucket: "safarnama-1928.firebasestorage.app",
    messagingSenderId: "972112284165",
    appId: "1:972112284165:web:ba02ac67dc7122d6b86a6c"
  };

// Cloudinary photo hosting. Needs an UNSIGNED upload preset (SETUP.md step 6).
export const cloudinaryConfig = {
  cloudName: "ddtrgzata",
  uploadPreset: "safarnama_unsigned"
};

// App identity. Change the name here when the final brand is chosen.
export const APP = {
  name: "Safarnama",
  tagline: "A journey deserves more than a story you told once.",
  contactEmail: ""
};
