import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from  'axios';

// material-ui
import {
    Grid,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField, 
    Tooltip,
} from '@material-ui/core';
import { Delete, Edit } from '@material-ui/icons';
import { MaterialReactTable } from 'material-react-table';

// project imports
import { gridSpacing } from './../../../store/constant';
import configData from './../../../config.js';

//-----------------------|| DEFAULT DASHBOARD ||-----------------------//

const Dashboard = () => {
    const [isLoading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [tableData, setTableData] = useState([]);

    const [validationErrors, setValidationErrors] = useState({});
    useEffect(() => {
        setLoading(false);
        const fetchData = async () => {
            try {
            const response = await axios.get(configData.API_SERVER + "dashboard");
            setTableData(response.data);
            } catch (error) {
            console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const handleCreateNewRow = (values) => {
        tableData.push(values);
        setTableData([...tableData]);
    };

    const handleSaveRowEdits = async ({ exitEditingMode, row, values }) => {
        if (!Object.keys(validationErrors).length) {
            console.log(values)
            tableData[row.index] = values;
            // TODO: edit api to backend
            const data = {
                "user_id": values.id,
                "username": values.username,
                "email": values.email,
                // "role": values.role,
            }

            console.log(data, "row_value")

            const requestOptions = {
                method: "POST",
                header: { "Content-Type": "application/json" },
                body: JSON.stringify({ data }),
            };

            const res = await axios.post(configData.API_SERVER + "users/edit", requestOptions);

            setTableData([...tableData]);
            exitEditingMode(); //required to exit editing mode and close modal
        }
    };

    const handleCancelRowEdits = () => {
        setValidationErrors({});
    };

    const handleDeleteRow = useCallback(
        (row) => {
            if (
                console.log('confirm')
            ) {
            return;
            }
            // TODO: delete api 
            console.log(row.index, "row.index");
            console.log(tableData[row.index].id, "table_value");
            let _user_id = tableData[row.index].id
            //send api delete request here, then refetch or update local table data for re-render
            axios.delete(configData.API_SERVER + `users/delete/${_user_id}`)
                .then(() => {
                    console.log("confirm delete request here")
                    tableData.splice(row.index, 1);
                    setTableData([...tableData]);
                })
                .catch((error) => {
                    console.log(error)
                });
        },
        [tableData],
    );

    const getCommonEditTextFieldProps = useCallback(
        (cell) => {
            return {
            error: !!validationErrors[cell.id],
            helperText: validationErrors[cell.id],
            onBlur: (event) => {
                const isValid =
                cell.column.id === 'email'
                    ? validateEmail(event.target.value)
                    : validateRequired(event.target.value);
                if (!isValid) {
                //set validation error for cell if invalid
                setValidationErrors({
                    ...validationErrors,
                    [cell.id]: `${cell.column.columnDef.header} is required`,
                });
                } else {
                //remove validation error for cell if valid
                delete validationErrors[cell.id];
                setValidationErrors({
                    ...validationErrors,
                });
                }
            },
            };
        },
        [validationErrors],
    );

    const columns = useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                enableColumnOrdering: false,
                enableEditing: false, //disable editing on this column
                enableSorting: false,
                size: 80,
            },
            {
                accessorKey: 'username',
                header: 'Username',
                size: 140,
                muiTableBodyCellEditTextFieldProps: ({ cell }) => ({
                    ...getCommonEditTextFieldProps(cell),
                }),
            },
            {
                accessorKey: 'email',
                header: 'Email',
                muiTableBodyCellEditTextFieldProps: ({ cell }) => ({
                    ...getCommonEditTextFieldProps(cell),
                    type: 'email',
                }),
            },
            {
                accessorKey: 'is_admin',
                header: 'Role',
                muiTableBodyCellEditTextFieldProps: ({ cell }) => ({
                    ...getCommonEditTextFieldProps(cell),
                    type: 'is_admin',
                }),
            },
        ],
        [getCommonEditTextFieldProps],
    );

    return (
        <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
            <MaterialReactTable
                    displayColumnDefOptions={{
                        'mrt-row-actions': {
                            muiTableHeadCellProps: {
                                align: 'center',
                            },
                            size: 120,
                        },
                    }}
                    columns={columns}
                    data={tableData}
                    editingMode="modal" //default
                    enableColumnOrdering
                    enableEditing
                    onEditingRowSave={handleSaveRowEdits}
                    onEditingRowCancel={handleCancelRowEdits}                                           
                    renderRowActions={({ cell, row, table }) => (
                        <Box sx={{ display: 'flex', gap: '1rem' }}>
                            <Tooltip arrow placement="left" title="Edit">
                            <IconButton onClick={() => table.setEditingRow(row)}>
                                <Edit />
                            </IconButton>
                            </Tooltip>
                            <Tooltip arrow placement="right" title="Delete">
                            <IconButton color="error" onClick={() => 
                                handleDeleteRow(row)
                                // console.log(row, 'row')
                                }>
                                <Delete />
                            </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                    // renderTopToolbarCustomActions={() => (
                    //     <Button
                    //         color="secondary"
                    //         onClick={() => setCreateModalOpen(true)}
                    //         variant="contained"
                    //     >
                    //         Create New Account
                    //     </Button>
                    // )}
                />
                <CreateNewAccountModal
                    columns={columns}
                    open={createModalOpen}
                    onClose={() => setCreateModalOpen(false)}
                    onSubmit={handleCreateNewRow}
                />
            </Grid>
        </Grid>
    );
};

//example of creating a mui dialog modal for creating new rows
export const CreateNewAccountModal = ({ open, columns, onClose, onSubmit }) => {
    const [values, setValues] = useState(() =>
      columns.reduce((acc, column) => {
        acc[column.accessorKey ?? ''] = '';
        return acc;
      }, {}),
    );
  
    const handleSubmit = () => {
      //put your validation logic here
      onSubmit(values);
      onClose();
    };
  
    return (
      <Dialog open={open}>
        <DialogTitle textAlign="center">Create New Account</DialogTitle>
        <DialogContent>
          <form onSubmit={(e) => e.preventDefault()}>
            <Stack
              sx={{
                width: '100%',
                minWidth: { xs: '300px', sm: '360px', md: '400px' },
                gap: '1.5rem',
              }}
            >
              {columns.map((column) => (
                <TextField
                  key={column.accessorKey}
                  label={column.header}
                  name={column.accessorKey}
                  onChange={(e) =>
                    setValues({ ...values, [e.target.name]: e.target.value })
                  }
                />
              ))}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: '1.25rem' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button color="secondary" onClick={handleSubmit} variant="contained">
            Create New Account
          </Button>
        </DialogActions>
      </Dialog>
    );
};
  
const validateRequired = (value) => !!value.length;
const validateEmail = (email) =>
!!email.length &&
email
    .toLowerCase()
    .match(
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );

export default Dashboard;
