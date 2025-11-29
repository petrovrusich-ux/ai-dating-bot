# Extract the long prompt from backup
with open('backend/chat/index_BACKUP_ORIGINAL.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract lines 120-677 (0-indexed: 119-676)
prompt_lines = lines[119:677]
long_prompt_content = ''.join(prompt_lines)

# Remove the 'system_message = f"""' prefix from first line
long_prompt_content = long_prompt_content.replace('    system_message = f"""', '', 1)

# Print for verification
print("LONG PROMPT EXTRACTED:")
print("="*80)
print(long_prompt_content)
print("="*80)
print(f"Total lines: {len(prompt_lines)}")
