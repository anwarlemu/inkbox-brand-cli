---
name: field
title: Field
type: ui
surface: site
description: "A field's label, control, description and error stacked 4px apart, fields 12px apart, with the 'or' hairline between two ways in."
use_for: "Wrap every form control in Field with a FieldLabel above it; add FieldDescription for a hint (Enter a vault key or generate a random one) and FieldError, with data-invalid on the Field and aria-invalid on the control, when the value is rejected. Group fields in FieldGroup, related choices in FieldSet with a FieldLegend. Put an action beside the label (Forgot password?) in a row with justify-between. Use orientation horizontal for a label beside its control, and FieldSeparator with \"or\" between a form and other ways in."
never: [A red label on an invalid field, A placeholder as the only label, Errors larger than 12px, Fields closer than 12px]
source: "Figma 427:2715: Login (Email address, Password, Forgot password?, or), Vault (Vault key and its description), Create Agent Identity (is not available, Will be displayed as)"
---
