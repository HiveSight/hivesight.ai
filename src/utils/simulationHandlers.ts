import { HandleSubmitParams, ResponseData } from '../types';
import { getCurrentUser } from '../services/auth';
import { createItem, createUniverse, createQuery, getQueryStatus, getQueryResponses } from '../services/database';
import { supabase } from '../components/SupabaseClient';

export const handleSignOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

export const handleSubmit = async ({
  question,
  responseTypes,
  hiveSize,
  perspective,
  ageRange,
  incomeRange,
  model,
  setLoading,
  setError,
  setResults,
  setActiveStep
}: HandleSubmitParams) => {
  if (!question || responseTypes.length === 0) {
    setError('Please fill in all required fields before submitting.');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const user = await getCurrentUser();
    console.log('Attempting to create item with:', {
      userId: user.id,
      question: question
    });
    
    // Create item
    const itemResult = await createItem(user.id, question);
    console.log('Item creation result:', itemResult);

    // Verify item was created by fetching it
    const { data: verifyItem, error: verifyError } = await supabase
      .from('items')
      .select('*')
      .eq('item_id', itemResult.item_id)
      .single();
    
    console.log('Verification query result:', {
      item: verifyItem,
      error: verifyError
    });

    if (itemResult.error) {
      throw itemResult.error;
    }

    // Create universe if needed
    const universeId = perspective === 'sample_americans' 
      ? await createUniverse(user.id, ageRange, incomeRange)
      : null;

    console.log('Creating query with:', {
      userId: user.id,
      itemId: itemResult.item_id,
      model,
      universeId,
      hiveSize
    });

    // Create the query using the item_id string
    const inserted = await createQuery({
      userId: user.id,
      itemId: itemResult.item_id,  // Pass just the string ID
      model,
      universeId,
      hiveSize
    });

    console.log('Query creation result:', inserted);

    const queryId = inserted.query_id;
    setActiveStep(2);
    
    // Poll for results
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const qData = await getQueryStatus(queryId);
        console.log(`Poll attempt ${attempts}, status:`, qData.execution_status);

        if (qData.execution_status === 'completed') {
          const responses = await getQueryResponses(queryId);
          console.log('Query responses:', responses);
          
          clearInterval(interval);
          setLoading(false);

          const formattedResponses: ResponseData = {
            question,
            responses: responses.map(r => ({
              perspective,
              age: r.respondent?.PRTAGE ?? 0,
              state: r.respondent?.GESTFIPS?.toString() ?? 'Unknown',
              income: 0,
              open_ended: r.response_text
            }))
          };

          setResults(formattedResponses);
          setActiveStep(3);
        } else if (qData.execution_status === 'error') {
          throw new Error('Error processing query');
        }

        if (attempts >= maxAttempts) {
          throw new Error('Query processing timed out');
        }
      } catch (pollError) {
        clearInterval(interval);
        setLoading(false);
        if (pollError instanceof Error) {
          setError(pollError.message);
        } else {
          setError('An unexpected error occurred while checking query status');
        }
      }
    }, 3000);
  } catch (err) {
    const error = err as Error;
    console.error('Error in handleSubmit:', error);
    setError(error.message || 'An unexpected error occurred');
    setLoading(false);
  }
};