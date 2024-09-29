import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
    Paper,
  } from '@mui/material';
  
  interface Response {
    perspective: string;
    age: number;
    income: number;
    state: string;
    open_ended?: string;
    likert?: number;
  }
  
  interface RawResultsTableProps {
    responses: Response[];
    hasOpenEnded: boolean;
    hasLikert: boolean;
  }
  
  function RawResultsTable({
    responses,
    hasOpenEnded,
    hasLikert,
  }: RawResultsTableProps) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Perspective</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Income</TableCell>
              <TableCell>State</TableCell>
              {hasOpenEnded && <TableCell>Open-ended Response</TableCell>}
              {hasLikert && <TableCell>Likert Score</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {responses.map((response: Response, index: number) => (
              <TableRow key={index}>
                <TableCell>{response.perspective}</TableCell>
                <TableCell>{response.age}</TableCell>
                <TableCell>${response.income.toLocaleString()}</TableCell>
                <TableCell>{response.state}</TableCell>
                {hasOpenEnded && <TableCell>{response.open_ended}</TableCell>}
                {hasLikert && <TableCell>{response.likert}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
  
  export default RawResultsTable;