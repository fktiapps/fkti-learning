# FKTI Caretaker — dining candidates (for Greg's review)

Veg-friendly places the caretaker found and thinks are worth adding to the **dining app**
(`fkti-dining-app`). **Nothing here is live.** The caretaker only proposes; Greg vets each — *celiac
safety is non-negotiable* — and, if good, pastes it into that city's `data/<city>.json` and deploys.

Each candidate uses the dining place schema, so it's drop-in ready. Template:

```json
{
  "id": "<city>_<slug>",
  "name": "日本語名 (English Name)",
  "category": "VEGAN | VEG | OMNI",
  "lat": 0.0, "lng": 0.0,
  "gf_confidence": "ask",
  "gf_label": "GF — ask",
  "gf_detail": "Honest reality. Never say 'safe'. Note soy-sauce/wheat/dashi risks + 'confirm with the kitchen'.",
  "vegan_status": "full | options | ask",
  "vegan_label": "Vegan — full | Vegan options | Vegan — ask",
  "vegan_detail": "What's actually plant-based here, honestly. Note any hidden dashi/egg/dairy risk.",
  "hours_raw": "as published",
  "source": "https://… (where this was verified)"
}
```

---

## Candidates

_(none yet — the caretaker will append here)_
