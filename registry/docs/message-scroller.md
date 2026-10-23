---
name: message-scroller
title: Message Scroller
type: ui
surface: site
description: "A conversation's scroll area that opens at the newest message, stays pinned to it as messages arrive, and offers a white Jump to latest pill once the reader scrolls up."
use_for: "Wrap a conversation: MessageScroller, then MessageScrollerViewport around MessageScrollerContent, one MessageScrollerItem per message, and a MessageScrollerButton. Give the scroller a fixed height (it fills its parent). Set scrollAnchor on the item the person just sent so the reply grows below it. Use MessageScrollerProvider to reach the scroller from outside (a composer), and the hooks useMessageScroller, useMessageScrollerScrollable and useMessageScrollerVisibility for custom controls."
never: [Sliding the jump pill in and out, Scrolling away from what the reader is reading when a message arrives, A scroller without a fixed height]
source: "Extrapolated from the Inkbox console (Figma 427:2715): the inbox list and reading pane, the white key with Shadow/S"
---
