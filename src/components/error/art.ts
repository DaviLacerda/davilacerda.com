/**
 * The error pages' ASCII art, drawn by hand on a monospaced grid. Keep each
 * piece under ~60 columns so it still reads on a 360px phone; the leading and
 * trailing blank lines are trimmed by `<ErrorScreen>`.
 */

/** 404: a cable pulled out of its socket, a spark in the gap. */
export const unplugged = String.raw`
          .------.                       .------.
 ---------|      |===                 [] |      |---------
          |      |        \  |  /        |      |
 ---------|      |===    --  *  --    [] |      |---------
          '------'        /  |  \        '------'
`;

/** Every other error: a cracked screen with crossed-out eyes. */
export const crashed = String.raw`
   .-------------------------------.
   |  .-------------------------.  |
   |  |          /              |  |
   |  |   \ /   /       \ /     |  |
   |  |    X   /\        X      |  |
   |  |   / \    \      / \     |  |
   |  |           \             |  |
   |  |        .---\-----.      |  |
   |  |       '     \     '     |  |
   |  '-------------------------'  |
   '-------------------------------'
               _|_______|_
`;
