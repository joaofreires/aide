import type { AideAPI } from '../preload'

declare global {
  interface Window {
    aide: AideAPI
  }
}
