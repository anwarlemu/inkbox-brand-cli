---
name: questionnaire
title: Questionnaire
type: ui
surface: site
description: "Questions asked one at a time: white choice cards with the brand's radio or checkbox and a shortcut key, a typed answer, a progress count and Previous, Skip and Next pills."
use_for: "Use when an agent or a setup flow needs a few answers in a row (how to route calls, what to include in a summary). Pass the questions as items to Questionnaire, then render a QuestionnaireItem per question with a QuestionnaireTitle, a QuestionnaireDescription, QuestionnaireChoices of QuestionnaireChoice (add QuestionnaireInput for another answer) and a QuestionnaireError; end with QuestionnaireActions holding Previous, Skip, Next and Submit. Mark required questions; set multiple to allow several answers. onSubmit receives the native form event: read the answers with FormData."
never: [More than one question on screen, Animating between questions, A required question without its error message, A purple card fill for a chosen answer]
source: "Extrapolated from the Inkbox console (Figma 427:2715): the radio and checks in Create Agent Identity and the Where does this agent run? picker"
---
