import React, { createContext, useState, useContext, useEffect } from 'react';

const BusinessUnitContext = createContext();

export const BusinessUnitProvider = ({ children }) => {
    // On récupère la valeur initiale depuis le localStorage ou on met 'cuisine' par défaut
    const [businessUnit, setBusinessUnit] = useState(localStorage.getItem('businessUnit') || 'cuisine');

    const updateBusinessUnit = (unit) => {
        setBusinessUnit(unit);
        localStorage.setItem('businessUnit', unit);
    };

    return (
        <BusinessUnitContext.Provider value={{ businessUnit, updateBusinessUnit }}>
            {children}
        </BusinessUnitContext.Provider>
    );
};

export const useBusinessUnit = () => useContext(BusinessUnitContext);
