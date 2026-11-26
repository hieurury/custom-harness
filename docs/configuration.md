# Configuration

The installer presents available themes, fonts, effects, and companions for
each integration. The options shown are read from that integration's manifest;
the currently shipped choices include Pixel 16-bit, Primeval Forest, and the
pixel owl.

## Preserve your preferences

When updating an existing installation, **Apply options** starts unchecked.
Leave it unchecked to update the runtime without changing your current theme,
pet, or other preferences. Enable it only when you want the values shown in the
installer to replace the selected settings. The installer backs up the
configuration before applying changes.

Settings, backups, and logs are stored separately for each integration in its
per-user data folder. Use **Open configuration & backup folder** in the
installer to locate that folder. Credentials are not displayed in the
installer's settings screen.

## Updates

The shared installer checks for a newer stable GitHub Release when it starts.
Use **Check for updates** to check again, then choose **Download update** to
save the matching installer. Downloading does not silently replace or run the
installed application; you decide when to run the downloaded installer.

GitHub does not provide anonymous access to private-repository release assets.
While this repository is private, update checking/downloading only works if the
release endpoint is made available to the client through an authorized method.
The current installer does not ask for a GitHub credential. See
[releasing](releasing.md) for the distribution choices.
