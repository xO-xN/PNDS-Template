# PNDS Template

title: PNDS Template
composer: PNDS

## Description:

The starting point for every PNDS digital score work: a ready-to-run skeleton where each performer plays a two-fader touch page, the conductor follows a monitor page, and the score server in between keeps seats, reconnection, theme and audio in step. Open this folder in PNDS App and perform it as it is — or grow it into your own work.

---

This folder is a **PNDS score project**, packaged and ready to run offline.

## How to perform

1. Install PNDS App (macOS, Apple Silicon):
   https://github.com/xO-xN/PNDS-App/releases/latest
2. Put the Mac and the performer devices on the same local network.
3. In PNDS App, click **Open** and select **this folder**.
4. Choose **Internal Synth**, pick an output device, then **Load**.
5. Performers open `http://<Host-LAN-IP>:6868/` on a phone/tablet in
   landscape: the left half of the screen is the AMP fader, the right half
   is the FREQ fader. The operator watches `http://<Host-LAN-IP>:6869/`.

You do not need to install Node.js or SuperCollider. PNDS App bundles both.
