import React, { createContext, useState, useContext } from 'react';

const SubAccountContext = createContext();

export const SubAccountProvider = ({ children }) => {
    const [activeSubAccount, setActiveSubAccount] = useState(null);

    return (
        <SubAccountContext.Provider value={{ activeSubAccount, setActiveSubAccount }}>
            {children}
        </SubAccountContext.Provider>
    );
};

export const useSubAccount = () => useContext(SubAccountContext);