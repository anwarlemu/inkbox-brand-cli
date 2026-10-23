---
name: combobox
title: Combobox
type: ui
surface: site
description: "The select trigger that opens a searchable list, for one value or several shown as lilac chips."
use_for: "Use instead of Select when there are more than about ten choices or people know what they are looking for (an agent, a contact, webhook events). Wrap ComboboxTrigger (or ComboboxChips with ComboboxChip and ComboboxChipsInput for several values) and ComboboxContent with ComboboxInput, ComboboxList, ComboboxItem rows and ComboboxEmpty in a Combobox with value and onValueChange (multiple for several). Pass items so the closed field can show labels. To let people add a new value, render an extra item for the search text from useCombobox()."
never: [A combobox for five or fewer choices (use Select or a radio group), Animating the highlight between rows, A list without an empty state, Chips in the purple]
source: "Extrapolated from the Inkbox console (Figma 427:2715): the select trigger (Any State), the command menu and the lilac handle chip"
---
