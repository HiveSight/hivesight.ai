#!/usr/bin/env bash

set -e

echo "Renaming GPT references to LLM..."

# Rename references inside files
# We'll target all .ts, .tsx, .sql, .sh files for simplicity. Add others if needed.
find . -not -path "./node_modules/*" \( -name "*.ts" -o -name "*.tsx" -o -name "*.sql" -o -name "*.sh" \) -print0 | while IFS= read -r -d '' file; do
    # Replace llm_queries with llm_queries
    sed -i '' 's/llm_queries/llm_queries/g' "$file"
    # Replace llm_responses with llm_responses
    sed -i '' 's/llm_responses/llm_responses/g' "$file"
    # Replace single llm_query with llm_query (for function names, variables)
    sed -i '' 's/llm_query/llm_query/g' "$file"
    # Replace process-llm-query with process-llm-query
    sed -i '' 's/process-llm-query/process-llm-query/g' "$file"
    # Replace llm-queries-and-responses with llm-queries-and-responses
    sed -i '' 's/llm-queries-and-responses/llm-queries-and-responses/g' "$file"

    # If there are scripts named *gpt* update them to llm
    sed -i '' 's/setup_llm_queries.sh/setup_llm_queries.sh/g' "$file"
    sed -i '' 's/finalize_llm_setup.sh/finalize_llm_setup.sh/g' "$file"
    sed -i '' 's/update_frontend_for_llm.sh/update_frontend_for_llm.sh/g' "$file"
done

echo "Renaming files and directories..."

# Rename SQL file
if [ -f supabase/sql/5-llm-queries-and-responses.sql ]; then
    git mv supabase/sql/5-llm-queries-and-responses.sql supabase/sql/5-llm-queries-and-responses.sql
fi

# Rename edge function directory
if [ -d supabase/functions/process-llm-query ]; then
    git mv supabase/functions/process-llm-query supabase/functions/process-llm-query
fi

# Rename scripts if they exist
if [ -f setup_llm_queries.sh ]; then
    git mv setup_llm_queries.sh setup_llm_queries.sh
fi
if [ -f finalize_llm_setup.sh ]; then
    git mv finalize_llm_setup.sh finalize_llm_setup.sh
fi
if [ -f update_frontend_for_llm.sh ]; then
    git mv update_frontend_for_llm.sh update_frontend_for_llm.sh
fi

echo "All references renamed to LLM. Please review and commit the changes."
