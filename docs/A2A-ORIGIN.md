# A2A origin of the repository

The public repository originally described a two-agent proof of concept:

1. a research agent gathered current AI-trend signals;
2. an evolver accepted those signals through an HTTP mailbox;
3. both used JSONL persistence.

At the start of the Haunted Studio build, the public repository contained the README description but not the JavaScript files named in it. Version 0.3 therefore implements a new, runnable A2A mailbox and persistence layer rather than pretending the described implementation was present.

The inherited idea remains important. External observer agents can send `observation_signal` messages to the studio, but the artistic system decides whether the material deserves attention. Delivery is not the same as significance.
