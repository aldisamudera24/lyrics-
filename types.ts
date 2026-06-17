/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LyricLine {
  id: string;
  text: string;
  sub?: string;
  start: number;
  end: number;
  synced: boolean;
}

export interface VideoTemplate {
  name: string;
  bgGradient: string;
  particleColor: string;
  specColor: string;
  fontFamily: string;
  lyricActiveColor: string;
}

export interface StyleSettings {
  // Lyric styles
  fontFamily: string;
  fontSize: number; // in px
  lyricColor: string;
  lyricActiveColor: string;
  lyricY: number; // 0 to 1 percentage
  lyricOpacity: number; // 0 to 1
  lyricShadow: number; // shadow blur in px

  // Subtitle styles
  subSize: number; // in px
  subColor: string;
  subY: number; // 0 to 1 percentage
  subBg: string;
  subBgOpacity: number; // 0 to 1

  // Spectrum styles
  specHeight: number; // peak height in px
  specBarW: number; // bar width in px
  specGap: number; // gap width in px
  specY: number; // 0 to 1 vertical location
  specMirror: boolean;
  specGlow: number; // glow blur in px
  specColor: string;

  // Active spectrum design index
  spectrumDesign: number;
}
