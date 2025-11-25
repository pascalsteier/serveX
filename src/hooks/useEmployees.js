import { useState, useEffect } from 'react';

const STORAGE_KEY = 'servex_employees';

const INITIAL_EMPLOYEES = [
    {
        id: 1,
        name: 'Jean Dupont',
        schedule: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }
    },
    {
        id: 2,
        name: 'Marie Martin',
        schedule: { mon: false, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }
    }
];

export function useEmployees() {
    const [employees, setEmployees] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    }, [employees]);

    const addEmployee = (name) => {
        const newEmployee = {
            id: Date.now(),
            name,
            schedule: { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false }
        };
        setEmployees([...employees, newEmployee]);
    };

    const removeEmployee = (id) => {
        setEmployees(employees.filter(emp => emp.id !== id));
    };

    const updateSchedule = (id, day) => {
        setEmployees(employees.map(emp => {
            if (emp.id === id) {
                return {
                    ...emp,
                    schedule: {
                        ...emp.schedule,
                        [day]: !emp.schedule[day]
                    }
                };
            }
            return emp;
        }));
    };

    return {
        employees,
        addEmployee,
        removeEmployee,
        updateSchedule
    };
}
