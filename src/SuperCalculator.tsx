import React, { useState } from 'react';

const SuperCalculator = () => {
    const [input, setInput] = useState('');
    const [result, setResult] = useState(null);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const calculate = () => {
        try {
            const calculatedResult = eval(input);
            setResult(calculatedResult);
        } catch (error) {
            setResult('Error');
        }
    };

    return (
        <div>
            <input type="text" value={input} onChange={handleInputChange} />
            <button onClick={calculate}>Calculate</button>
            {result !== null && <h2>Result: {result}</h2>}
        </div>
    );
};

export default SuperCalculator;