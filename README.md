# Infinity Block

Infinity Block is a Chrome extension that helps users avoid online distractions 
while working on their computer. The extension can be used to block certain websites
when enabled and allows for different blocking profiles to suit multiple different
types of work.

# Development
## Setup

After downloading the repository, use

```
$ yarn install
```

to install the libraries required by the extension. Then, use

```
$ yarn run build
```

to build the extension application. This should produce a `dist` folder in the repository.
Navigate to the Chrome extension page, and enable developer mode at the top right corner. 
Click `Load unpacked` at the top left corner, navigate to the `dist` folder in the 
repository and click `Select Folder`.