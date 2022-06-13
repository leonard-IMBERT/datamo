/**
 * @file writer.hpp
 * @author Imbert Leonard (imbert@subatech.in2p3.fr)
 * @brief Description of the writer and the differents items you can write
 * @version 0.1
 * @date 2022-06-13
 *
 * @copyright Copyright (c) 2022
 */
#include <string>
#include <fstream>
#include <mutex>
#include <string>
#include <torch/torch.h>

#ifndef DATA_MO_H
#define DATA_MO_H

/**
 * @brief Namespace containing all the library
 */
namespace DataMo {

/**
 * @brief The different writable types implemented
 *
 * For morem details, see the README.md at the root of the project
 */
enum WritableType {
  // Monitoring
  SCALAR, /**< A simple scalar */
  TENSOR, /**< A tensor */

  // Metadata
  META_PROJECT, /**< Meta tag that specify the project */
};

/**
 * @brief Abstract structure representing an item
 */
struct Item {
  std::string name;
  WritableType type;
  unsigned long size;
  void * data_pointer = nullptr;
};

/**
 * @brief Implementation of the scalar item
 */
struct ScalarItem : public Item {
  double data;

  /**
   * @brief Construct a new Scalar Item object
   *
   * @param n Name of the item
   * @param d The value it take
   */
  ScalarItem(std::string n, double d) : data(d) {
    name = n;
    type = SCALAR;
    size = 8;
    data_pointer = &data;
  };
};

/**
 * @brief Implementation of the tensor item
 */
struct TensorItem : public Item {
  /**
   * @brief The tensor to log
   *
   * Implementation make it cloned on cpu, detached from the graph
   * and as float64
   */
  torch::Tensor data;

  /**
   * @brief Construct a new Tensor Item object
   *
   * @param n The name of the item
   * @param d The new tensor value
   */
  TensorItem(std::string n, torch::Tensor d) {
    name = n;
    type = TENSOR;
    data = d.clone().detach().cpu().to(torch::kFloat64).contiguous();


    data_pointer = data.data_ptr<double>();
    size = 1;
    for(unsigned int order = 0; order < d.sizes().size(); order ++) {
      size = size * d.size(order);
    }

    // Take care here. The size of the writed tensor depends on the
    // implementation of double by the compiler
    size = size * sizeof(double);
  };
};

/**
 * @brief Implementation of the meta entry: Project
 */
struct MetaProjectItem : public Item {
  /**
   * @brief Construct a new Meta Project Item object
   *
   * @param n Name of the project
   */
  MetaProjectItem(std::string n) {
    name = n;
    type = META_PROJECT;
    size = 0;
    data_pointer = nullptr;
  };
};


/**
 * @brief The writer that will write item in the .datamo file
 *
 * It is designed to be thread safe:
 * i.e., it use mutex to ensure no concurrent acces to the file by the instance
 * it ensure, all data have been flushed to the file before inputing new data
 *
 * Thet facts ensure that the data are writed in the order they were given to the
 * writer
 *
 * Beware if it is used by multiple threads: the data will be written in the file
 * in the same order the threads called it.
 */
class Writer {
 private:
  std::mutex _file_lock;
  std::ofstream _out_stream;

  std::string _out_file = "log.datamo";

  std::string _out_location;
 public:
 /**
  * @brief Construct a new Writer object
  *
  * @param location Place where to create the log file
  */
  Writer(std::string location);

  /**
   * @brief Destroy the Writer object
   */
  ~Writer();


  /**
   * @brief Set the out location object
   *
   * It SHOULD be terminated by a `/` considering it is appened
   * to the out file
   */
  void set_out_location(std::string);

  /**
   * @brief Set the name of the out file. It will still be place in
   * the out locatio0n
   *
   * /!\ Warning: You should not but if you give a path to this function
   * know that it will be appened to the out location resulting in undefined behavior
   */
  void set_out_file(std::string);

  /**
   * @brief Write an item to the log file
   *
   * @param data The data to write
   */
  void write_data(Item * data);
};

} // namespace DataMo

#endif