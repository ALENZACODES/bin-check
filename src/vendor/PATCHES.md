# Changes to vendored files

`transformers.min.js` is Transformers.js 4.3.2 as published, with one change: the class name `Mistral3ForConditionalGeneration` is renamed `Mistral3ForCondGeneration` in its three places. GitHub's secret scanning mistook the 32 character name for an API key. Bin Check never uses that model, so the rename has no effect.
