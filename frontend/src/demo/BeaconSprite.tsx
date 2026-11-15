import sheet from './assets/robot-expressive/spritesheet.webp';

// Beacon is drawn from the bundled RobotExpressive sprite sheet (see assets/robot-expressive/SOURCE.md).
// The frame window is fixed in CSS, so idle and greeting never shift. Warm the cache once so a profile
// switch never shows an empty frame; the file is served by this project, never downloaded from elsewhere.
if (typeof Image !== 'undefined') new Image().src = sheet;

/** `greeting` plays the wave once while the chat is open; news only lifts the figure slightly. */
export function BeaconSprite({ pose, greeting }: { pose: 'idle' | 'news' | 'interaction'; greeting: boolean }) {
  return (
    <span className={`sprout beacon-sprite${greeting ? ' is-greeting' : ''}${pose === 'news' ? ' is-news' : ''}`} data-beacon={greeting ? 'greeting' : 'idle'} aria-hidden="true">
      <span className="beacon-frame" style={{ backgroundImage: `url(${sheet})` }} />
    </span>
  );
}
