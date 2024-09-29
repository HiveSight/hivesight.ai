import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    LabelList,
  } from 'recharts';
  import { Typography, Box } from '@mui/material';
  import { LIKERT_LABELS, LIKERT_COLORS } from '../config';
  
  type ChartDataItem = {
    name: string;
    [key: string]: string | number;
  };
  
  interface LikertChartProps {
    data: ChartDataItem[];
    title: string;
  }
  
  function LikertChart({ data, title }: LikertChartProps) {
    return (
      <Box mt={2}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              reversed={title !== 'Overall Distribution of Responses'}
            />
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`} />
            {LIKERT_LABELS.map((label) => (
              <Bar
                key={label}
                dataKey={label}
                stackId="a"
                fill={LIKERT_COLORS[label as keyof typeof LIKERT_COLORS]}
              >
                <LabelList
                  dataKey={label}
                  position="inside"
                  formatter={(value: number) =>
                    value > 0.05 ? `${(value * 100).toFixed(0)}%` : ''
                  }
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  }
  
  export default LikertChart;