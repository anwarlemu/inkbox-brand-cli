---
name: input-otp
title: Input OTP
type: ui
surface: site
description: "Joined 40px slots in the field's edge with a purple active slot and a blinking caret."
use_for: "Use for one-time codes from email or SMS (a login code, a vault unlock code). Set maxLength to the code's length and pattern to REGEXP_ONLY_DIGITS for numbers; split long codes into groups with InputOTPSeparator. Paste and SMS autofill fill every slot at once; onComplete fires when the code is full."
never: [Separate inputs per digit, Auto-submitting without a visible result, Hiding the characters of a one-time code]
source: "Extrapolated from the Inkbox console (Figma 427:2715): Form- Input's 40px, edge and focus"
---
