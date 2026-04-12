# AGENTS - Project agent notes

Compartir memorias entre máquinas usando engram (comandos útiles):

Share memories across machines. Uses compressed chunks — no merge conflicts, no huge files.

engram sync                    # Export new memories as compressed chunk
git add .engram/ && git commit -m "sync engram memories"
engram sync --import           # On another machine: import new chunks
engram sync --status           # Check sync status
